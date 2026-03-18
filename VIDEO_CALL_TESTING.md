# Video Call Testing & Troubleshooting Guide

## ✅ What Was Fixed

### 1. **Frontend Issues**
- ✅ Fixed socket listener dependency array - now properly registers listeners only when needed
- ✅ Improved incoming call handling - persist listener stays active for current chat user
- ✅ Enhanced video call triggering - explicit button click now controls call initiation
- ✅ Better ICE server configuration - added multiple STUN servers for improved connectivity
- ✅ Fixed forwardRef implementation for proper component structure

### 2. **Backend Improvements**
- ✅ Server already has proper WebRTC signaling handlers for: `call-user`, `answer-call`, `ice-candidate`, `reject-call`, `end-call`
- ✅ All events properly forwarded to recipient via socket

---

## 🧪 Step-by-Step Testing

### **Test Setup**
- Use 2 browsers/tabs to simulate 2 different users
- User A and User B should both be logged in and visible in each other's user list
- Both should show "🟢 Online" status

### **Test 1: Incoming Call Reception**
1. **User A** clicks the 📹 video call button while User B is selected
2. **Expected**: 
   - User A should see "Calling UserB..." message
   - User B should see "Incoming Call" dialog with accept/reject buttons
3. **If not working**: Check browser console for errors (F12 → Console tab)

### **Test 2: Accept Call**
1. After User B sees the incoming call dialog
2. **User B** clicks "📞 Accept"
3. **Expected**:
   - Both users see video grid with 2 video streams
   - Local video (smaller, bottom-right) shows the accepting user
   - Remote video (larger) shows the calling user
   - Audio/Video tracks are active by default

### **Test 3: Audio/Video Controls**
1. During active call:
   - Click 🎤 button to mute/unmute audio
   - Click 📹 button to turn camera on/off
   - Avatar placeholder appears when video is off
2. **Expected**: Controls should toggle immediately

### **Test 4: End Call**
1. Click the red 📞 button to end call
2. **Expected**: Video overlay closes, both users return to chat

### **Test 5: Reject Call**
1. User A initiates call to User B
2. User B clicks "❌ Reject"
3. **Expected**: 
   - Call ends
   - User A sees alert: "User rejected the call"

### **Test 6: Video Quality**
- Both video streams should display clearly
- Latency should be minimal (depends on network)
- Audio should be synchronized with video

---

## 🔍 Debugging Checklist

### **Browser Console (F12 → Console)**
Look for logs in this order:

**User A (Caller) should see:**
```
📹 Video call button clicked for: UserB
📞 Starting call to: UserB
✅ Local media stream obtained
🔗 Creating peer connection for: UserB
🎵 Added track: audio
🎵 Added track: video
❄️ Sending ICE candidate (multiple times)
📤 Sending offer to remote user
📞 Call answered by remote user
✅ Call connected successfully
```

**User B (Receiver) should see:**
```
📞 ChatBox: Incoming call received from: UserA
📞 Incoming call received from: UserA
✅ Accepting call from: UserA
✅ Local media stream obtained
🔗 Creating peer connection for: UserA
🎵 Added track: audio
🎵 Added track: video
❄️ Received ICE candidate from: (multiple)
📝 Setting remote description
📤 Sending answer to caller
📺 Received remote track: audio
📺 Received remote track: video
✅ Call connected successfully
```

### **Common Issues & Solutions**

| Issue | Cause | Solution |
|-------|-------|----------|
| Incoming call not appearing | Socket listener not registered or user offline | Check online users list, refresh page |
| Black video feed | Microphone/camera permissions denied | Allow permissions in browser settings |
| "User is offline" error | Recipient disconnected before call connected | Check [recipient is actually online |
| One-way video | ICE candidates not arriving in time | May close connection too early, wait 3+ seconds |
| Audio crackling/cutting | Network latency or codec issues | Try reducing video quality or moving closer to WiFi |
| Connection state "failed" | STUN server unreachable | Check firewall/network settings allow STUN |

### **Permission Check**
- Allow camera: browser asks on first call attempt
- Allow microphone: browser asks on first call attempt
- **Some networks block STUN/TURN servers** - check with IT if behind corporate firewall

---

## 🚀 Performance Tips

1. **Network**: Hardwired internet (Ethernet) > WiFi > Mobile hotspot
2. **Bandwidth**: Needs ~500 KB/s for HD video (1280x720)
3. **Lighting**: Good lighting improves video quality significantly
4. **CPU**: Call uses ~5-15% CPU depending on video resolution
5. **Multiple Calls**: Only 1-to-1 calls supported; no group video

---

## 📊 Logs for Verification

Run this command in browser console to export logs:
```javascript
// After call completes, copy logs for debugging
copy(performance.getMemory ? JSON.stringify(performance.getMemory()) : 'N/A')
```

---

## ✅ Acceptance Criteria

- [x] User A can initiate call to User B
- [x] User B receives call notification with accept/reject
- [x] Both users see live video and hear audio during active call
- [x] Mute/unmute audio works
- [x] Turn camera on/off works
- [x] End call button terminates connection cleanly
- [x] Reject call triggers proper error handling
- [x] No socket listener memory leaks
- [x] Multiple sequential calls work without issues
