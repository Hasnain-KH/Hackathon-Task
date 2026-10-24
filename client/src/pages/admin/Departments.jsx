import OrgResourcePage from './OrgResourcePage.jsx';

export default function Departments() {
  return (
    <OrgResourcePage
      title="Departments"
      endpoint="/departments"
      description="Manage company departments and their status."
      fields={[
        { name: 'name', label: 'Department name', required: true },
        { name: 'code', label: 'Department code', required: true },
        { name: 'description', label: 'Description' },
      ]}
      columns={[
        { key: 'name', label: 'Department' },
        { key: 'code', label: 'Code' },
        { key: 'description', label: 'Description' },
      ]}
    />
  );
}
