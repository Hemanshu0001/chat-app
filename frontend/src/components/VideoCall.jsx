import { useState, useEffect, useRef } from 'react';
import { getAvatarColor, getInitials } from '../utils/helpers';

const STUN_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export default function VideoCall({ 
  currentUser, 
  socket, 
  incomingCall, 
  onClose,
  activeChatUser 
}) {
  const [callState, setCallState] = useState('idle'); // idle, receiving, calling, active
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
      setRemoteUser({ userId: incomingCall.from });
      setCallState('receiving');
    }
  }, [incomingCall, callState]);

  // Handle call cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

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
    if (remoteUser) {
      socket.emit('end-call', { to: remoteUser.userId });
    }
    cleanup();
    onClose();
  };

  const rejectCall = () => {
    if (incomingCall) {
      socket.emit('reject-call', { to: incomingCall.from });
    }
    cleanup();
    onClose();
  };

  const startCall = async (targetUserId) => {
    setRemoteUser({ userId: targetUserId });
    setCallState('calling');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(targetUserId, stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call-user', { to: targetUserId, offer });
    } catch (err) {
      console.error('Failed to start call:', err);
      alert('Could not access camera or microphone');
      endCall();
    }
  };

  const acceptCall = async () => {
    setCallState('active');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(incomingCall.from, stream);
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer-call', { to: incomingCall.from, answer });
      
      // Process any pending ICE candidates
      processPendingCandidates(pc);
    } catch (err) {
      console.error('Failed to accept call:', err);
      alert('Could not access camera or microphone');
      rejectCall();
    }
  };

  const createPeerConnection = (targetUserId, stream) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    peerConnection.current = pc;

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: targetUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            endCall();
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
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState('active');
        processPendingCandidates(peerConnection.current);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ice candidate', e);
        }
      } else {
        pendingIceCandidates.current.push(candidate);
      }
    };

    const handleRejected = () => {
      alert(`${remoteUser?.userId || 'User'} rejected the call`);
      cleanup();
      onClose();
    };

    const handleEnded = () => {
      cleanup();
      onClose();
    };

    socket.on('call-answered', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-rejected', handleRejected);
    socket.on('call-ended', handleEnded);

    return () => {
      socket.off('call-answered', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-rejected', handleRejected);
      socket.off('call-ended', handleEnded);
    };
  }, [socket, remoteUser]);

  // Export startCall so ChatBox can trigger it
  useEffect(() => {
    if (activeChatUser && callState === 'idle' && !incomingCall) {
        startCall(activeChatUser.userId);
    }
  }, [activeChatUser]);

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

  if (callState === 'idle' && !incomingCall) return null;

  return (
    <div className="call-overlay">
      <div className="call-card glass">
        {callState === 'receiving' ? (
          <div className="call-incoming">
            <div className="avatar-huge pulse" style={{ background: getAvatarColor(remoteUser?.userId) }}>
              {getInitials(remoteUser?.userId)}
            </div>
            <h2>Incoming Call</h2>
            <p>{remoteUser?.userId} is calling you...</p>
            <div className="call-actions">
              <button className="btn-call accept" onClick={acceptCall}>
                📞 Accept
              </button>
              <button className="btn-call reject" onClick={rejectCall}>
                ❌ Reject
              </button>
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
                      <div className="avatar-lg" style={{ background: getAvatarColor(remoteUser?.userId) }}>
                        {getInitials(remoteUser?.userId)}
                      </div>
                   </div>
                )}
                <div className="user-label">{remoteUser?.userId}</div>
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
              {callState === 'calling' ? `Calling ${remoteUser?.userId}...` : 'Call in progress'}
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
}
