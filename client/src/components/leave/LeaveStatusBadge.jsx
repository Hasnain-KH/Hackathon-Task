import Badge from '../ui/Badge.jsx';

export default function LeaveStatusBadge({ status }) {
  const tone = status === 'approved' ? 'green'
    : status === 'rejected' ? 'red'
      : status === 'cancelled' ? 'slate'
        : 'amber';
  return <Badge tone={tone}>{status}</Badge>;
}
