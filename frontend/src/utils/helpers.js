export const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getInitials = (name) => {
  return name ? name.charAt(0).toUpperCase() : '?';
};

export const getAvatarColor = (userId) => {
  const colors = [
    '#1e40af', '#3b82f6', '#60a5fa', // Navy and Light Blues
    '#94a3b8', '#cbd5e1', '#f8fafc', // Greys and White
    '#2563eb', '#1d4ed8', '#475569', // Professional shades
  ];
  if (!userId) return colors[1]; // Return default primary color if userId is not provided
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
