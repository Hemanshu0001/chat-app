import { useState, useEffect, useRef, forwardRef } from 'react';
import { getAvatarColor, getInitials } from '../utils/helpers';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

const VideoCall = forwardRef(function VideoCall({ 
  currentUser, 
  socket, 
  incomingCall, 
  onClose,
  activeChatUser,
  globalIceCandidates = []
}, ref) {
  const [callState, setCallState] = useState('idle');
  const [remoteUser, setRemoteUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pendingIceCandidates = useRef([]);

  // Initialize call from incoming call
  useEffect(() => {
    if (incomingCall && callState === 'idle') {
      console.log('📞 INCOMING CALL HANDLER: Setting up receiving state', {
        from: incomingCall.from,
        hasOffer: !!incomingCall.offer
      });
      setRemoteUser({ userId: incomingCall.from });
      setCallState('receiving');
    }
  }, [incomingCall, callState]);

  // Handle call cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Bind local stream to video ref
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  // Bind remote stream to video ref
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  // Cleanup effect
  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setRemoteUser(null);
    pendingIceCandidates.current = [];
  };

  const endCall = () => {
    if (remoteUser && socket) {
      socket.emit('end-call', { to: remoteUser.userId });
    }
    cleanup();
    if (onClose) onClose();
  };

  const rejectCall = () => {
    if (incomingCall && socket) {
      socket.emit('reject-call', { to: incomingCall.from });
    }
    cleanup();
    if (onClose) onClose();
  };

  const startCall = async (targetUserId) => {
    console.log('📞 Starting call to:', targetUserId);
    
    if (!socket) {
      alert('Socket not connected. Please refresh and try again.');
      return;
    }

    setRemoteUser({ userId: targetUserId });
    setCallState('calling');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      console.log('✅ Local media stream obtained');
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection(targetUserId, stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('📤 Sending offer to remote user');

      socket.emit('call-user', { to: targetUserId, offer });
    } catch (err) {
      console.error('Failed to start call:', err);
      alert('Could not access camera or microphone. Please check permissions.');
      cleanup();
      if (onClose) onClose();
    }
  };

  const acceptCall = async () => {
    console.log('✅ Accepting call from:', incomingCall.from);
    
    if (!socket) {
      alert('Socket not connected. Please refresh and try again.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      console.log('✅ Local media stream obtained');
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection(incomingCall.from, stream);
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      console.log('📝 Setting remote description');

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('📤 Sending answer to caller');

      socket.emit('answer-call', { to: incomingCall.from, answer });
      
      // Set call state to active after successful setup
      setCallState('active');
      
      // Process any pending ICE candidates
      processPendingCandidates(pc);
    } catch (err) {
      console.error('Failed to accept call:', err);
      alert('Could not access camera or microphone. Please check permissions.');
      rejectCall();
    }
  };

  const createPeerConnection = (targetUserId, stream) => {
    console.log('🔗 Creating peer connection for:', targetUserId);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnection.current = pc;

    // Add local tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
      console.log('🎵 Added track:', track.kind);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('❄️ Sending ICE candidate');
        socket.emit('ice-candidate', { to: targetUserId, candidate: event.candidate });
      }
    };

    // Handle remote track
    pc.ontrack = (event) => {
      console.log('📺 Received remote track:', event.track.kind);
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('🔌 Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.error('Connection failed or disconnected');
        endCall();
      } else if (pc.connectionState === 'connected') {
        console.log('✅ Call connected successfully');
      }
    };

    return pc;
  };

  const processPendingCandidates = async (pc) => {
    while (pendingIceCandidates.current.length > 0) {
      const candidate = pendingIceCandidates.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding pending ice candidate', e);
      }
    }
  };

  // Socket listeners for signaling
  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async ({ answer }) => {
      console.log('📞 Call answered by remote user');
      if (peerConnection.current && answer) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallState('active');
          processPendingCandidates(peerConnection.current);
        } catch (e) {
          console.error('Error setting remote description:', e);
        }
      }
    };

    const handleIceCandidate = async (data) => {
      console.log('❄️ Received ICE candidate from:', data?.from);
      const { candidate } = data;
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        try {
          if (candidate) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (e) {
          console.error('Error adding ice candidate:', e);
        }
      } else {
        if (candidate) {
          pendingIceCandidates.current.push(candidate);
        }
      }
    };

    const handleRejected = () => {
      console.log('❌ Call rejected by remote user');
      alert(`${remoteUser?.userId || 'User'} rejected the call`);
      cleanup();
      if (onClose) onClose();
    };

    const handleEnded = () => {
      console.log('📞 Call ended by remote user');
      cleanup();
      if (onClose) onClose();
    };

    const handleUserOffline = ({ to }) => {
      console.log(`⚠️ User ${to} is offline`);
      alert(`User ${to} is not online. Cannot establish call.`);
      cleanup();
      if (onClose) onClose();
    };

    socket.on('call-answered', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-rejected', handleRejected);
    socket.on('call-ended', handleEnded);
    socket.on('user-offline', handleUserOffline);
    
    // Attempt to process any early candidates that arrived before we mounted
    if (globalIceCandidates && globalIceCandidates.length > 0) {
      console.log('🔄 Processing early global ICE candidates', globalIceCandidates.length);
      globalIceCandidates.forEach(cand => {
        // Only process candidates meant for us
        if (cand?.from && (remoteUser?.userId === cand.from || incomingCall?.from === cand.from)) {
          handleIceCandidate(cand);
        } else if (!cand.from) {
           handleIceCandidate(cand);
        }
      });
      // Clear them so we don't process them again on re-renders,
      // modifying it modifies the array passed from ChatPage by reference!
      globalIceCandidates.length = 0; 
    }

    return () => {
      socket.off('call-answered', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-rejected', handleRejected);
      socket.off('call-ended', handleEnded);
      socket.off('user-offline', handleUserOffline);
    };
  }, [socket]);

  // Auto-start call when component is shown
  useEffect(() => {
    if (activeChatUser && callState === 'idle' && !incomingCall && !remoteUser && socket) {
      console.log('🎯 Auto-initiating call to:', activeChatUser.userId);
      startCall(activeChatUser.userId);
    }
  }, [activeChatUser, callState, incomingCall, remoteUser, socket]);

  const toggleMuteAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleMuteVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoMuted(!isVideoMuted);
    }
  };

  if (callState === 'idle' && !incomingCall) {
    console.log('🚫 VideoCall: Not showing - idle state and no incoming call');
    return null;
  }

  console.log('✅ VideoCall: SHOWING - callState:', callState, 'hasIncomingCall:', !!incomingCall);

  // Determine the display state
  const isReceiving = callState === 'receiving' || (callState === 'idle' && incomingCall);
  const isActive = callState === 'active' || (callState === 'calling');
  
  const displayUserId = remoteUser?.userId || incomingCall?.from || activeChatUser?.userId;

  return (
    <div className="call-overlay">
      <div className="call-card glass">
        {isReceiving ? (
          <div className="call-incoming animate-slide-in">
            <div className="call-header">
              <h2 className="call-title">📞 Incoming Call</h2>
              <p className="call-status">Someone is calling...</p>
            </div>

            <div className="call-avatar-section">
              <div className="avatar-huge pulse" style={{ background: getAvatarColor(displayUserId) }}>
                <span className="avatar-text">{getInitials(displayUserId)}</span>
              </div>
              <div className="call-info">
                <h3 className="caller-name">{displayUserId}</h3>
                <p className="calling-status">
                  <span className="status-dot"></span> Calling
                </p>
              </div>
            </div>

            <div className="call-actions">
              <button 
                className="btn-call accept" 
                onClick={acceptCall}
                title="Accept the call"
              >
                <span className="btn-icon">✓</span>
                <span className="btn-text">Accept</span>
              </button>
              <button 
                className="btn-call reject" 
                onClick={rejectCall}
                title="Reject the call"
              >
                <span className="btn-icon">✕</span>
                <span className="btn-text">Decline</span>
              </button>
            </div>

            <div className="call-footer">
              <small>Press Escape to dismiss</small>
            </div>
          </div>
        ) : (
          <div className="call-active">
            <div className="video-grid">
              <div className="remote-video-container">
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="remote-video"
                />
                {(!remoteStream || !remoteStream.getVideoTracks().some(t => t.enabled)) && (
                   <div className="video-placeholder">
                      <div className="avatar-lg" style={{ background: getAvatarColor(displayUserId) }}>
                        {getInitials(displayUserId)}
                      </div>
                   </div>
                )}
                <div className="user-label">{displayUserId}</div>
              </div>
              
              <div className="local-video-container">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="local-video"
                />
                {isVideoMuted && (
                   <div className="video-placeholder">
                      <div className="avatar-sm" style={{ background: getAvatarColor(currentUser.userId) }}>
                        {getInitials(currentUser.userId)}
                      </div>
                   </div>
                )}
              </div>
            </div>

            <div className="call-status">
              {callState === 'calling' ? `Calling ${displayUserId}...` : 'Call in progress'}
            </div>

            <div className="call-controls">
              <button 
                className={`btn-control ${isAudioMuted ? 'muted' : ''}`} 
                onClick={toggleMuteAudio}
                title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isAudioMuted ? '🔇' : '🎤'}
              </button>
              <button 
                className={`btn-control ${isVideoMuted ? 'muted' : ''}`} 
                onClick={toggleMuteVideo}
                title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoMuted ? '📵' : '📹'}
              </button>
              <button className="btn-control end" onClick={endCall} title="End Call">
                📞
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default VideoCall;
