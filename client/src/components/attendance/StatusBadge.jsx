import Badge from '../ui/Badge.jsx';

const statusLabels = {
  present: ['Present', 'green'],
  late: ['Late', 'amber'],
  half_day: ['Half day', 'blue'],
  missing_checkout: ['Missing checkout', 'orange'],
  absent: ['Absent', 'red'],
  on_leave: ['On leave', 'blue'],
  not_checked_in: ['Not checked in', 'slate'],
  scheduled: ['Scheduled', 'slate'],
};

export default function StatusBadge({ status }) {
  const [label, tone] = statusLabels[status] || [status || 'Unknown', 'slate'];
  return <Badge tone={tone}>{label}</Badge>;
}
