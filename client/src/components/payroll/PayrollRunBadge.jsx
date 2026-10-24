import Badge from '../ui/Badge.jsx';

export default function PayrollRunBadge({ status }) {
  return <Badge tone={status === 'finalized' ? 'green' : 'amber'}>{status}</Badge>;
}
