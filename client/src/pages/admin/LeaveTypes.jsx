import Badge from '../../components/ui/Badge.jsx';
import OrgResourcePage from './OrgResourcePage.jsx';

export default function LeaveTypes() {
  return (
    <OrgResourcePage
      title="Leave Types"
      endpoint="/leave-types"
      description="Set yearly leave quotas. Use zero for unlimited leave."
      fields={[
        { name: 'name', label: 'Leave type name', required: true },
        { name: 'code', label: 'Code', required: true },
        { name: 'quotaPerYear', label: 'Quota per year (days)', type: 'number', min: 0, step: 0.5, required: true, defaultValue: 0 },
        { name: 'isPaid', label: 'Paid leave', type: 'checkbox', defaultValue: true },
      ]}
      columns={[
        { key: 'name', label: 'Leave type' },
        { key: 'code', label: 'Code' },
        { key: 'quotaPerYear', label: 'Yearly quota', render: (item) => item.quotaPerYear === 0 ? <Badge tone="blue">Unlimited</Badge> : `${item.quotaPerYear} days` },
        { key: 'isPaid', label: 'Payment', render: (item) => item.isPaid ? 'Paid' : 'Unpaid' },
      ]}
    />
  );
}
