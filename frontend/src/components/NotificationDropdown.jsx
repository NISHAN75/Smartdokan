import { useEffect, useRef, useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

const iconMap = {
  danger: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('smartdokan-read-notifications') || '[]');
    } catch {
      return [];
    }
  });

  const notifications = data?.notifications || [];
  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;

  useEffect(() => {
    const handleOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const markAllRead = () => {
    const ids = notifications.map((item) => item.id);
    setReadIds(ids);
    localStorage.setItem('smartdokan-read-notifications', JSON.stringify(ids));
  };

  const handleNotificationClick = (notification) => {
    const next = Array.from(new Set([...readIds, notification.id]));
    setReadIds(next);
    localStorage.setItem('smartdokan-read-notifications', JSON.stringify(next));
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Loading notifications...</div>
            )}

            {isError && (
              <div className="px-4 py-8 text-center text-sm text-red-500">Unable to load notifications.</div>
            )}

            {!isLoading && !isError && notifications.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto mb-2 text-slate-300" size={28} />
                <p className="text-sm font-medium text-slate-700">No notifications</p>
                <p className="mt-1 text-xs text-slate-400">Everything looks good right now.</p>
              </div>
            )}

            {!isLoading && !isError && notifications.map((notification) => {
              const Icon = iconMap[notification.type] || Info;
              const isUnread = !readIds.includes(notification.id);

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${isUnread ? 'bg-blue-50/40' : 'bg-white'}`}
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${notification.type === 'danger' ? 'bg-red-100 text-red-600' : notification.type === 'warning' ? 'bg-amber-100 text-amber-600' : notification.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{notification.title}</span>
                      {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{notification.message}</span>
                  </span>
                  <ArrowRight className="mt-1 shrink-0 text-slate-300" size={15} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
