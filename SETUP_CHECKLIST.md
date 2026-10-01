# Live Group Chat - Setup Checklist

## ✅ Implementation Complete

This checklist helps you verify that the live group chat feature is working correctly.

## Pre-Flight Checks

- [ ] Ensure `.env` file has `VITE_STREAM_API_KEY` configured
- [ ] Ensure `.env` file has `VITE_BACKEND_URL` (should be http://localhost:3000 for local development)
- [ ] Backend server is running (`npm run dev` in `nodejs-ai-assistant/`)
- [ ] Frontend dev server is running (`npm run dev` in `react-stream-ai-assistant/`)

## Backend Verification

Test new group chat endpoints:

### 1. Create Group
```bash
curl -X POST http://localhost:3000/create-group \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "members": ["user1", "user2"],
    "createdBy": "user1"
  }'
```
✅ Should return: `{ message, channelId, name, members }`

### 2. Get User Groups
```bash
curl http://localhost:3000/groups/user1
```
✅ Should return: `{ groups: [...]}`

### 3. Add Members
```bash
curl -X POST http://localhost:3000/add-member \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "group-xyz",
    "memberIds": ["user3"]
  }'
```
✅ Should return: `{ message, channelId, addedMembers }`

### 4. Remove Members
```bash
curl -X POST http://localhost:3000/remove-member \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "group-xyz",
    "memberIds": ["user3"]
  }'
```
✅ Should return: `{ message, channelId, removedMembers }`

## Frontend Feature Verification

### UI Elements
- [ ] "Group Chat" tab appears next to "AI Assistant" tab
- [ ] "New Group" button visible on group list
- [ ] Group list shows existing groups (if any)
- [ ] Can create a new group with name
- [ ] Group chat interface opens when group is selected

### Real-Time Features
- [ ] Messages appear immediately when sent
- [ ] Typing indicator shows when other user types
- [ ] Online member count updates in real-time
- [ ] Member panel shows online/offline status
- [ ] Green dot appears for online members
- [ ] Gray dot appears for offline members

### Message History
- [ ] Previous messages load when opening group
- [ ] Message timestamps display correctly
- [ ] User avatars show with messages
- [ ] Message order is correct (newest at bottom)

## Testing Steps

### Single User Test
1. Log in with user account
2. Go to "Group Chat" tab
3. Create a group named "Test"
4. Send a message
5. Verify message appears in chat
6. Verify typing indicator appears while typing

### Multi-User Test
1. Open two browser windows/incognito tabs
2. Log in with different users (user1, user2)
3. User1: Create group "Multi-User Test" with user2
4. User2: Refresh/Go to Groups - should see "Multi-User Test"
5. User2: Click into group
6. User1: Send message "Hello from User1"
7. User2: Should see message immediately
8. User2: Type a response
9. User1: Should see typing indicator
10. User2: Send response
11. User1: Should see message from User2
12. Both: Should see each other as "online"

### Member Panel Test
1. With 2+ users in group
2. Click "Members" button
3. Verify all members listed
4. Online members in top section with green dot
5. Offline members in bottom section with gray dot
6. Toggle between online/offline by:
   - User1: Watch User2 go offline
   - User2: Close browser/app
   - User1: See User2 move to offline section after ~30 seconds
   - User2: Refresh page
   - User1: See User2 return to online section

## Common Issues & Solutions

### Issue: "Group Chat" tab not showing
**Solution:** 
- Clear browser cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Verify authenticated-app.tsx imports are correct

### Issue: Messages not appearing
**Solution:**
- Check WebSocket connection in browser DevTools → Network
- Verify Stream client initialized (should see "Connecting to chat..." briefly)
- Restart backend server
- Check `.env` variables are correct

### Issue: Typing indicator not working
**Solution:**
- May require MCP (Message Composition Protocol) enabled in Stream
- Check browser console for errors
- Verify `usePresence` hooks are correctly implemented

### Issue: Online status not updating
**Solution:**
- May take 30 seconds to sync
- Check user presence is enabled in Stream Channel
- Verify `useUserPresence` hook is called on GroupChat component

### Issue: 404 on backend endpoints
**Solution:**
- Verify backend server is running on correct port
- Check `VITE_BACKEND_URL` matches running server
- Review backend/index.ts for new group routes

## Next Steps

Once verified, consider adding:

1. **Add Member UI** - Complete the "Add Member" button in MemberPanel
2. **Delete Group** - Add ability to delete groups
3. **Leave Group** - Let users leave groups without deleting
4. **Group Settings** - Edit group name, description
5. **Reactions** - Add emoji reactions to messages
6. **File Sharing** - Share documents/images in groups
7. **Permissions** - Admin roles and moderation
8. **Search** - Search through group messages

## Support

For issues:
1. Check browser console for errors
2. Review backend logs
3. Check Stream Dashboard for channel/message status
4. Verify all `.env` variables are set correctly

---

**Implementation Date:** April 16, 2026
**Platform Version:** AI Collaboration Platform v1.0 with Live Group Chat
