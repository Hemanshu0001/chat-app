import { formatTime } from '../utils/helpers';

export default function MessageBubble({ message, isSent }) {
  return (
    <div className={`msg-row ${isSent ? 'sent' : 'received'}`}>
      <div className={`bubble ${isSent ? 'sent' : 'received'}`}>
        <div>{message.message}</div>
        <div className="bubble-time">
          {formatTime(message.timestamp)}
          {isSent && (
            <span className="check-icon">
              {message.isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
