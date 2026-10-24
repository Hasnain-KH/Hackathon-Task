import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api/axios.js';
import Button from '../ui/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/';

function haversineMeters(lat1, lng1, lat2, lng2) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function getPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
      (error) => reject(new Error(error.message || 'Could not get your location.')),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0, ...options },
    );
  });
}

export default function CameraCheckInModal({ settings, onClose, onUnavailable, onSuccess }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const dialogRef = useRef(null);
  const streamRef = useRef(null);
  const faceApiRef = useRef(null);
  const detectionRef = useRef(false);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;
  const toast = useToast();
  const [faceCount, setFaceCount] = useState(0);
  const [location, setLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Starting camera and location…');

  useEffect(() => {
    const previousFocus = document.activeElement;
    const focusable = () => [...(dialogRef.current?.querySelectorAll('button:not([disabled])') || [])];
    focusable()[0]?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busyRef.current) closeRef.current();
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) return;
      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? elements.at(-1) : elements[0]).focus();
      } else if (event.shiftKey && document.activeElement === elements[0]) {
        event.preventDefault();
        elements.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === elements.at(-1)) {
        event.preventDefault();
        elements[0].focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, []);

  const detectFrame = useCallback(async () => {
    while (detectionRef.current) await new Promise((resolve) => window.setTimeout(resolve, 40));
    if (!faceApiRef.current || !videoRef.current || videoRef.current.readyState < 2) return null;
    detectionRef.current = true;
    try {
      const apiFace = faceApiRef.current;
      const detections = await apiFace.detectAllFaces(
        videoRef.current,
        new apiFace.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }),
      );
      setFaceCount(detections.length);
      const canvas = canvasRef.current;
      if (canvas && videoRef.current) {
        const dimensions = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        apiFace.matchDimensions(canvas, dimensions);
        const resized = apiFace.resizeResults(detections, dimensions);
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        for (const item of resized) {
          const { x, y, width, height } = item.box;
          context.strokeStyle = '#22c55e';
          context.lineWidth = 3;
          context.strokeRect(x, y, width, height);
        }
      }
      return detections.length;
    } catch (detectionError) {
      setError(`Face detection is unavailable: ${detectionError.message}`);
      return null;
    } finally {
      detectionRef.current = false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer;
    let watchId;
    let stream;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.geolocation) {
        throw new Error('Camera or geolocation is not available in this browser.');
      }
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (!active) {
        cameraStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = cameraStream;
      streamRef.current = stream;
      const apiFace = await import('@vladmandic/face-api');
      await apiFace.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      if (!active) {
        cameraStream.getTracks().forEach((track) => track.stop());
        return;
      }
      faceApiRef.current = apiFace;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      watchId = navigator.geolocation.watchPosition(
        ({ coords }) => {
          if (!active) return;
          const current = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
          setLocation(current);
          setDistance(haversineMeters(current.lat, current.lng, Number(settings.officeLat), Number(settings.officeLng)));
          setStatus('Camera and location ready.');
        },
        (geoError) => {
          if (!active) return;
          setError(geoError.message || 'Could not get your location.');
          setStatus('Location unavailable.');
          onUnavailable(`Camera check-in could not access your location. Use web check-in instead. ${geoError.message || ''}`);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      );
      setLoading(false);
      timer = window.setInterval(detectFrame, 500);
    };

    start().catch((startError) => {
      if (active) onUnavailable(`Camera not available — use web check-in. ${startError.message}`);
    });

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
      if (watchId !== undefined) navigator.geolocation?.clearWatch(watchId);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [detectFrame, onUnavailable, settings.officeLat, settings.officeLng]);

  const canCheckIn = faceCount === 1
    && location
    && location.accuracy <= 100
    && distance <= Number(settings.officeRadiusMeters || 150)
    && !busy
    && !loading;

  const checkIn = async () => {
    setBusy(true);
    setError('');
    try {
      const currentFaces = await detectFrame();
      if (currentFaces !== 1) throw new Error('Exactly one face is required.');
      const currentLocation = await getPosition();
      const currentDistance = haversineMeters(
        currentLocation.lat, currentLocation.lng, Number(settings.officeLat), Number(settings.officeLng),
      );
      if (currentLocation.accuracy > 100) throw new Error(`GPS accuracy is ${Math.round(currentLocation.accuracy)} m; maximum is 100 m.`);
      if (currentDistance > Number(settings.officeRadiusMeters || 150)) {
        throw new Error(`You are ${Math.round(currentDistance)} m from the office; allowed radius is ${settings.officeRadiusMeters} m.`);
      }
      await api.post('/attendance/check-in/camera', {
        location: currentLocation,
        faceDetected: true,
        faceCount: currentFaces,
      });
      toast('Checked in successfully with camera.');
      await onSuccess();
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Could not check in.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !busy) onClose();
  }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="camera-check-in-title" tabIndex={-1} className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div><h2 id="camera-check-in-title" className="text-xl font-bold text-ink">Camera check-in</h2><p className="mt-1 text-sm text-slate-600">Single face, stay inside office radius, good lighting.</p></div>
        <button type="button" aria-label="Close camera check-in" disabled={busy} onClick={onClose} className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">✕</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="relative mx-auto mt-4 max-h-[55vh] overflow-hidden rounded-xl bg-slate-950">
        <video ref={videoRef} className="block max-h-[55vh] w-full object-contain" autoPlay muted playsInline aria-label="Camera preview" />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm text-white">Loading camera and face detection…</div>}
      </div>
      <p className="mt-3 text-sm text-slate-600" aria-live="polite">{status}</p>
      <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <p>Faces detected: <strong>{faceCount}</strong> (must be 1)</p>
        <p>GPS accuracy: <strong>{location ? `${Math.round(location.accuracy)} m` : 'Waiting…'}</strong> (must be ≤ 100 m)</p>
        <p>Office distance: <strong>{distance === null ? 'Waiting…' : `${Math.round(distance)} m`}</strong> (radius {settings.officeRadiusMeters} m)</p>
      </div>
      <p className="mt-3 text-xs text-slate-500">No photos or video are captured or uploaded. Face detection runs in your browser.</p>
      <div className="mt-5 flex justify-end gap-3">
        <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button type="button" disabled={!canCheckIn} onClick={checkIn}>{busy ? 'Checking in…' : 'Check In'}</Button>
      </div>
    </section>
  </div>;
}
