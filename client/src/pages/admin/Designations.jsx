import { useEffect, useState } from 'react';
import api from '../../api/axios.js';
import OrgResourcePage from './OrgResourcePage.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';

export default function Designations() {
  const [departments, setDepartments] = useState([]);
  const [departmentError, setDepartmentError] = useState('');

  useEffect(() => {
    api.get('/departments', { params: { limit: 100, isActive: true } })
      .then(({ data }) => setDepartments(data.items))
      .catch((error) => setDepartmentError(apiErrorMessage(error, 'Could not load departments for the designation form.')));
  }, []);

  const fields = [
    { name: 'name', label: 'Designation name', required: true },
    {
      name: 'departmentId',
      label: 'Department',
      type: 'select',
      required: true,
      read: (item) => item.departmentId?._id || item.departmentId || '',
      options: departments.map((item) => ({ value: item._id, label: `${item.name} (${item.code})` })),
    },
    {
      name: 'level',
      label: 'Level',
      type: 'select',
      defaultValue: 'mid',
      options: ['junior', 'mid', 'senior', 'lead', 'manager'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })),
    },
  ];

  return (
    <OrgResourcePage
      title="Designations"
      endpoint="/designations"
      description="Define job titles and associate them with departments."
      preloadError={departmentError}
      fields={fields}
      columns={[
        { key: 'name', label: 'Designation' },
        { key: 'department', label: 'Department', render: (item) => item.departmentId?.name || '—' },
        { key: 'level', label: 'Level', render: (item) => item.level?.[0]?.toUpperCase() + item.level?.slice(1) },
      ]}
    />
  );
}
