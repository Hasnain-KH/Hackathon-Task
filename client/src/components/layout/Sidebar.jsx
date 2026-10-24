import { NavLink } from 'react-router-dom';

const menus = {
  admin: [
    ['Dashboard', '/admin'],
    ['Company', '/admin/company'],
    ['Departments', '/admin/departments'],
    ['Designations', '/admin/designations'],
    ['Leave Types', '/admin/leave-types'],
    ['Holidays', '/admin/holidays'],
    ['HR Users', '/admin/hr-users'],
    ['Employees', '/admin/employees'],
    ['Attendance', '/admin/attendance'],
    ['Corrections', '/admin/attendance/corrections'],
    ['Payroll', '/admin/payroll'],
    ['Settings', '/admin/settings', true],
  ],
  hr: [
    ['Dashboard', '/hr'],
    ['Employees', '/hr/employees'],
    ['Attendance', '/hr/attendance'],
    ['Corrections', '/hr/attendance/corrections'],
    ['Leave', '/hr/leave'],
    ['Payroll', '/hr/payroll'],
  ],
  employee: [
    ['Dashboard', '/employee'],
    ['My Profile', '/employee/profile'],
    ['My Attendance', '/employee/attendance'],
    ['My Leave', '/employee/leave'],
    ['My Payslips', '/employee/payslips'],
  ],
};

export default function Sidebar({ role, open = false, onNavigate = () => {} }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand font-bold text-white">H</span>
        <span className="font-bold text-ink">HCM Lite</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">
        <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
        {(menus[role] || []).map(([label, path, disabled]) => (
          disabled ? (
            <span key={path} aria-disabled="true" title="Coming in a later step" className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm text-slate-400">
              {label}<span className="text-[10px]">Soon</span>
            </span>
          ) : (
            <NavLink
              key={path}
              end={path === '/admin' || path === '/hr' || path === '/employee'}
              to={path}
              onClick={onNavigate}
              className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-indigo-50 text-brand' : 'text-slate-600 hover:bg-slate-50 hover:text-ink'}`}
            >
              {label}
            </NavLink>
          )
        ))}
      </nav>
      <div className="border-t border-slate-100 p-4 text-xs capitalize text-slate-400">{role} workspace</div>
    </aside>
  );
}
