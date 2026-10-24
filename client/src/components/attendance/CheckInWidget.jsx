import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import Button from '../ui/Button.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import Loader from '../ui/Loader.jsx';
import StatusBadge from './StatusBadge.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../ui/useApiError.js';
import { useAuth } from '../../context/AuthContext.jsx';

const CameraCheckInModal = lazy(() => import('./CameraCheckInModal.jsx'));

function localTime(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
}

export default function CheckInWidget() {
  const { user } = useAuth();
  const toast = useToast();
  const [today, setToday] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('');

  const refresh = useCallback(async () => {
    const { data } = await api.get('/attendance/me/today');
    setToday(data.data);
  }, []);
  const refreshAfterCameraCheckIn = useCallback(async () => {
    try {
      await refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Checked in, but could not refresh today’s attendance.'));
    }
  }, [refresh]);

  useEffect(() => {
    Promise.allSettled([api.get('/attendance/me/today'), api.get('/company')])
      .then(([todayResult, settingsResult]) => {
        if (todayResult.status === 'fulfilled') {
          setToday(todayResult.value.data.data);
        } else {
          setError(apiErrorMessage(todayResult.reason, 'Could not load today’s attendance.'));
        }
        if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!locationEnabled) {
      setLocation(null);
      setLocationMessage('');
      return;
    }
    if (!navigator.geolocation) {
      setLocationMessage('Location is not available in this browser; check-in can continue without it.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });
        setLocationMessage('Location ready.');
      },
      () => setLocationMessage('Location unavailable; you can still check in.'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }, [locationEnabled]);

  const checkIn = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/attendance/check-in', location ? { location } : {});
      toast('Checked in successfully.');
      await refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not check in.'));
      toast(apiErrorMessage(requestError, 'Could not check in.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const checkOut = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/attendance/check-out');
      toast('Checked out successfully.');
      await refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not check out.'));
      toast(apiErrorMessage(requestError, 'Could not check out.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader label="Loading check-in status" />;

  return (
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-card sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Today · {today?.date}</p>
          <h2 className="mt-2 text-xl font-bold text-ink">Attendance check-in</h2>
          <p className="mt-1 text-sm text-slate-600">Office starts at {settings?.officeStart || '09:00'} · {settings?.graceMinutes ?? 15} minutes grace</p>
        </div>
        {today?.record && <StatusBadge status={today.record.status} />}
      </div>
      <ErrorBanner>{error}</ErrorBanner>
      {cameraMessage && <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{cameraMessage}</p>}
      {today?.record ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4"><p className="text-xs text-slate-500">Checked in</p><p className="mt-1 font-semibold text-ink">{localTime(today.record.checkInAt)}</p></div>
          {today.record.checkOutAt ? (
            <>
              <div className="rounded-xl bg-white p-4"><p className="text-xs text-slate-500">Checked out</p><p className="mt-1 font-semibold text-ink">{localTime(today.record.checkOutAt)}</p></div>
              <div className="rounded-xl bg-white p-4"><p className="text-xs text-slate-500">Worked</p><p className="mt-1 font-semibold text-ink">{Math.floor(today.record.workedMinutes / 60)}h {today.record.workedMinutes % 60}m</p></div>
            </>
          ) : <div className="flex items-center"><Button type="button" disabled={busy} onClick={checkOut}>{busy ? 'Checking out…' : 'Check Out'}</Button></div>}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button type="button" disabled={busy} className="min-w-36 py-3 text-base" onClick={checkIn}>{busy ? 'Checking in…' : 'Check In'}</Button>
          {user?.role === 'employee' && settings?.officeLat !== null && settings?.officeLat !== undefined
            && settings?.officeLng !== null && settings?.officeLng !== undefined
            && <Button type="button" variant="secondary" className="py-3" onClick={() => { setCameraMessage(''); setCameraOpen(true); }}>Check in with camera</Button>}
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={locationEnabled} onChange={(event) => setLocationEnabled(event.target.checked)} />Include my location (optional)</label>
          {locationMessage && <span className="text-xs text-slate-500">{locationMessage}</span>}
        </div>
      )}
      {cameraOpen && <Suspense fallback={<div role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 text-white">Loading camera check-in…</div>}>
        <CameraCheckInModal
          settings={settings}
          onClose={() => setCameraOpen(false)}
          onUnavailable={(message) => { setCameraMessage(message); setCameraOpen(false); }}
          onSuccess={refreshAfterCameraCheckIn}
        />
      </Suspense>}
    </section>
  );
}
