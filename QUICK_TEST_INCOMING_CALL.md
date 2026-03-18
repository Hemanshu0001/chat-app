# Quick Test Guide - Video Call Receiver Incoming Call

## ✅ Pre-Test Checklist
- [ ] Backend running (`npm start` in backend folder)
- [ ] Frontend built (`npm run build` in frontend folder)
- [ ] App serving on http://localhost:5000
- [ ] 2 browser windows/tabs ready

## 🧪 Test Procedure (5 minutes)

### **Setup (2 minutes)**
1. **Browser 1:** http://localhost:5000 → Login as User A
2. **Browser 2:** http://localhost:5000 → Login as User B
3. Both should show in each other's user list
4. **Verify online status:** Both show 🟢 Online

### **Test Incoming Call (3 minutes)**

#### **Step 1: Initiate Call from Browser 1 (User A)**
```
1. In Browser 1, click on User B in user list
2. Click 📹 video button
3. Should show "Calling User B..." message
4. Look at console (F12): Should show logs starting with "🎯 Auto-initiating call"
```

#### **Step 2: Receive Call in Browser 2 (User B)**
```
1. Check Browser 2 - SHOULD SEE:
   ✅ Incoming Call dialog box
   ✅ User A's name/avatar
   ✅ "Accept" button
   ✅ "Reject" button

2. Open console (F12) - SHOULD SEE:
   🔔 INCOMING CALL DETECTED from: UserA
   📱 Call data: { from: 'UserA', offer: {...} }
   ✅ VideoCall: SHOWING - callState: idle hasIncomingCall: true

3. If you see BLANK SCREEN instead:
   - Check console for errors (red text)
   - Refresh page
   - Verify socket is connected
```

#### **Step 3: Accept Call (Browser 2)**
```
1. Click "📞 Accept"
2. Browser might ask for camera/microphone permissions
3. SHOULD SEE:
   ✅ Two video streams (local + remote)
   ✅ User A's camera feed in larger area
   ✅ Your own camera preview in corner
   ✅ Audio working (speak and listen)

4. Console should show:
   ✅ Local media stream obtained
   ✅ Call connected successfully
```

#### **Step 4: Test Controls**
```
1. Click 🎤 (mute audio)
   - Should toggle mute state
   
2. Click 📹 (turn camera off)
   - Should hide video, show avatar
   
3. Talk to each other
   - Audio should be clear
```

#### **Step 5: End Call**
```
1. Click red 📞 button
2. SHOULD HAPPEN:
   ✅ Video dialog closes for both
   ✅ Returns to chat view
   ✅ Can see chat history still

3. Console shows:
   📞 Call ended by remote user
```

## 🔍 Console Debugging Guide

### **Expected Console Logs - Receiver (User B)**

**When call arrives:**
```
🔔 INCOMING CALL DETECTED from: UserA
📱 Call data: {from: "UserA", offer: {...}}
✅ VideoCall: SHOWING - callState: idle hasIncomingCall: true
📞 INCOMING CALL HANDLER: Setting up receiving state {from: "UserA", hasOffer: true}
```

**When Accept is clicked:**
```
✅ Accepting call from: UserA
✅ Local media stream obtained
🔗 Creating peer connection for: UserA
🎵 Added track: audio
🎵 Added track: video
❄️ Sending ICE candidate (multiple)
📝 Setting remote description
📤 Sending answer to caller
📺 Received remote track: audio
📺 Received remote track: video
✅ Call connected successfully
```

### **If Blank Screen - Troubleshooting**

Check console for these errors:

| Error | Solution |
|-------|----------|
| `Socket not connected` | Refresh page, verify backend is running |
| `Permission denied` | Allow camera/mic permissions in browser |
| `Cannot read property 'from' of null` | incomingCall not being set - see below |
| `Connection failed` | Wait 3-5 seconds, firewall might be blocking |

**If incomingCall not being set:**
1. Open DevTools Network tab
2. Filter by "socket.io"
3. Look for "incoming-call" event
4. Check if it has the call data
5. If present but not showing: Browser bug - try different browser
6. If NOT present: Server not forwarding - check backend logs

## 📱 Alternative: Test with Different Browsers

If 2 tabs don't work well:
- [ ] Browser 1: Chrome on PC
- [ ] Browser 2: Firefox on PC
- [ ] Browser 3: Safari on Mac (if available)
- [ ] Browser 4: Mobile browser (if available)

This helps isolate if it's a browser-specific issue.

## ✅ Success Criteria

Call is working if:
- [ ] Incoming call appears on receiver side
- [ ] Accept/Reject buttons are clickable
- [ ] Both video streams show
- [ ] Audio works both ways
- [ ] No errors in console
- [ ] Mute/Camera controls work
- [ ] End call closes properly

## 🚀 Next Steps

If test passes:
- Deploy to production
- Share with testers
- Monitor for any issues

If test fails:
- Check console logs carefully
- Review INCOMING_CALL_FIX.md
- Verify backend is running
- Try clearing cache (Ctrl+Shift+Delete)

