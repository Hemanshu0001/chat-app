import { formatTime } from '../utils/helpers';
import { FaCheck, FaCheckDouble, FaTrash } from 'react-icons/fa';

export default function MessageBubble({ 
  message, 
  isSent, 
  selectionMode, 
  isSelected, 
  onSelect,
  onDelete 
}) {
  const handleClick = () => {
    if (selectionMode) {
      onSelect?.(message._id);
    }
  };

  const handleLongPress = (e) => {
    if (!selectionMode) {
      e.preventDefault();
      onDelete?.(message._id);
    }
  };

  return (
    <div 
      className={`msg-row ${isSent ? 'sent' : 'received'} ${selectionMode ? 'selectable' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onContextMenu={handleLongPress}
    >
      {/* Selection checkbox for messages in selection mode */}
      {selectionMode && (
        <div className="msg-checkbox">
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={() => onSelect?.(message._id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      
      <div className={`bubble ${isSent ? 'sent' : 'received'}`}>
        <div>{message.message}</div>
        <div className="bubble-time">
          {formatTime(message.timestamp)}
          {isSent && (
            <span className="check-icon">
              {message.isRead ? <FaCheckDouble /> : <FaCheck />}
            </span>
          )}
        </div>
      </div>
      
      {/* Quick delete button for messages (not in selection mode) */}
      {!selectionMode && (
        <button 
          className="msg-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(message._id);
          }}
          title="Delete message"
        >
          <FaTrash />
        </button>
      )}
    </div>
  );
}
