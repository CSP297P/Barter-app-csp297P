
# 📦 Refined Bartering App Feature Plan: Messaging & Trade Lifecycle

A complete, improved implementation plan for a bartering web app that introduces item-based messaging, trade request handling, and trade session lifecycle management.

---

## 🧭 Key Design Decisions

- ❌ **No Counter Offers**: Trade offers are final; users can cancel and resend but cannot negotiate in-thread.
- 🔒 **One Active Trade Per Item**: Items are locked once included in an accepted trade session.
- 🛡 **Both Users Can Cancel or Mark Completed**, but **both must agree to finalize** the trade.
- 🧾 **Messages are extracted into a `Message` model** for scalability.
- 📌 **Canceled and Completed trades are visible** in session history (read-only).
- 🔔 **Notifications** are UI-based only (tab + badge); no push/email in this version.
- 🧪 Basic test coverage recommended for all APIs and status transitions.

---

## 🧱 Backend: Express.js (in `server/`)

### 1. MongoDB Models

#### `models/TradeRequest.js`
```js
const mongoose = require('mongoose');

const tradeRequestSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  offeredItemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  message: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'denied', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('TradeRequest', tradeRequestSchema);
```

#### `models/TradeSession.js`
```js
const mongoose = require('mongoose');

const tradeSessionSchema = new mongoose.Schema({
  tradeRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeRequest', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  itemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  status: {
    type: String,
    enum: ['active', 'cancelled', 'ready_to_trade', 'completed'],
    default: 'active'
  },
  isChatActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('TradeSession', tradeSessionSchema);
```

#### `models/Message.js`
```js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeSession', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
```

---

### 2. API Endpoints

#### Trade Request
- `POST /api/trades/request`
- `GET /api/trades/notifications/:userId`
- `POST /api/trades/:id/respond` (accept or deny)

#### Trade Session
- `POST /api/sessions/start/:tradeRequestId`
- `GET /api/sessions/:userId`
- `POST /api/sessions/:sessionId/status` (cancel, ready, complete)

#### Messaging
- `GET /api/messages/:sessionId`
- `POST /api/messages/send`

---

## 🎨 Frontend: React.js (in `src/`)

### 1. Pages & Components

#### `MessagesPage.js` (pages/Messages/)
- **Three-Panel Layout**:
  1. **Left**: List of sessions
  2. **Middle**: Chat messages + input
  3. **Right**: Item details + trade status buttons

#### `TradeRequestModal.js` (components/)
- Opens on "Request Trade" button
- Multi-item select (if barter) + message input
- Calls `/api/trades/request`

#### `NotificationsTab.js` (components/)
- Slide-in or dropdown panel
- Shows all pending trade requests
- Accept/Deny triggers backend request

---

### 2. Trade Status Actions

- **Cancel Trade**: Ends session for both users
- **Ready to Trade**: One user sets, both see
- **Completed**: Both must set to finalize → removes items from marketplace

---

### 3. UI Behaviors

- Completed/cancelled sessions are shown read-only in message history
- Chat input disabled if session is not active
- Notifications tab includes unread badge

---

## 🔁 Trade Lifecycle (Simplified)

```text
A → sees item → "Request Trade"
  → selects items (barter) or none (giveaway)
  → adds message → sends request

B → sees notification → Accept or Deny
  → Accept creates TradeSession → chat starts

Either user:
  → Cancel → ends session
  → Ready to Trade → status marked
  → Both mark Completed → ends session, removes items
```

---

## 📁 New/Updated Files

| Path | Description |
|------|-------------|
| `server/models/TradeRequest.js` | Handles offer metadata |
| `server/models/TradeSession.js` | Handles session lifecycle |
| `server/models/Message.js` | Stores all chat messages |
| `src/components/TradeRequestModal.js` | UI for sending offers |
| `src/components/NotificationsTab.js` | Incoming requests UI |
| `src/pages/Messages/MessagesPage.js` | Main trade chat interface |
| `src/services/tradeService.js` | API handlers for above endpoints |

---

## ✅ Acceptance Criteria

- Trade requests can be sent (barter or giveaway)
- Requests can be accepted/denied
- Chat opens only after acceptance
- Trade statuses are updated in-session
- Items removed on trade completion
- Canceled and completed trades are viewable

---

## 🔮 Future Enhancements

- WebSocket support for real-time chat
- Trade feedback system
- Push/email notifications
- Report/block functionality
- Marketplace filter for traded items
