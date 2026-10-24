import Input from '../ui/Input.jsx';

export default function MonthPicker({ value, onChange, label = 'Payroll month', error }) {
  return <Input type="month" label={label} value={value} error={error} onChange={(event) => onChange(event.target.value)} />;
}
