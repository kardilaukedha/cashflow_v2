import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Megaphone, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_roles: string[];
  is_active: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

const PRIORITY_CONFIG = {
  low:    { label: 'Info',     border: 'border-l-gray-300',  bg: 'bg-gray-50',    badge: 'bg-gray-100 text-gray-600',   icon: Info },
  normal: { label: 'Info',     border: 'border-l-blue-400',  bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700',   icon: Info },
  high:   { label: 'Penting',  border: 'border-l-orange-400', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  urgent: { label: 'Mendesak', border: 'border-l-red-500',   bg: 'bg-red-50',     badge: 'bg-red-100 text-red-700',     icon: AlertTriangle },
};

export default function AnnouncementBoard() {
  const { userRole } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { fetchAnnouncements(); }, [userRole]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (data) {
      const role = userRole || 'karyawan';
      const filtered = (data as Announcement[]).filter(a => a.target_roles.includes(role));
      setAnnouncements(filtered);
    }
    setLoading(false);
  };

  if (loading) return <div className="h-20 bg-gray-100 animate-pulse rounded-xl" />;
  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="w-4 h-4 text-yellow-600" />
        <span className="text-sm font-semibold text-gray-700">Pengumuman</span>
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">{announcements.length}</span>
      </div>
      {announcements.map(a => {
        const cfg = PRIORITY_CONFIG[a.priority];
        const Icon = cfg.icon;
        const isExpanded = expanded === a.id;
        return (
          <div key={a.id} className={`border-l-4 ${cfg.border} ${cfg.bg} rounded-r-xl p-4 cursor-pointer`}
            onClick={() => setExpanded(isExpanded ? null : a.id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-70" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                  {isExpanded && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{a.content}</p>}
                  {!isExpanded && <p className="text-sm text-gray-600 mt-1 line-clamp-1">{a.content}</p>}
                </div>
              </div>
              <div className="flex-shrink-0">
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
