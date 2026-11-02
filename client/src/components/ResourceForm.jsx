import { useState, useEffect, useRef, useId } from 'react';
import Modal from './Modal.jsx';
import { AMENITIES } from '../utils/amenities.js';
import { createResource, updateResource } from '../api/resources.js';

/**
 * Resource create / edit form inside an accessible Modal.
 *
 * @param {object} props
 * @param {boolean} props.open Whether modal is open
 * @param {() => void} props.onClose Callback invoked when closing modal
 * @param {object|null} [props.resource] Resource to edit, or null/undefined for create
 * @param {(resource: object) => void} [props.onSuccess] Callback on successful save
 */
export default function ResourceForm({ open, onClose, resource = null, onSuccess }) {
  const formId = useId();
  const isEdit = Boolean(resource?._id);

  const [name, setName] = useState('');
  const [type, setType] = useState('room');
  const [capacity, setCapacity] = useState(1);
  const [location, setLocation] = useState('');
  const [amenities, setAmenities] = useState([]);
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState({});
  const [serverAlert, setServerAlert] = useState(null);
  const [busy, setBusy] = useState(false);

  const isSubmittingRef = useRef(false);
  const nameRef = useRef(null);
  const typeRef = useRef(null);
  const capacityRef = useRef(null);
  const locationRef = useRef(null);
  const descriptionRef = useRef(null);

  // Reset / populate form on open or resource change
  useEffect(() => {
    if (open) {
      if (resource) {
        setName(resource.name || '');
        const resType = resource.type || 'room';
        setType(resType);
        setCapacity(resType === 'desk' ? 1 : (resource.capacity ?? 1));
        setLocation(resource.location || '');
        setAmenities(Array.isArray(resource.amenities) ? [...resource.amenities] : []);
        setDescription(resource.description || '');
      } else {
        setName('');
        setType('room');
        setCapacity(1);
        setLocation('');
        setAmenities([]);
        setDescription('');
      }
      setErrors({});
      setServerAlert(null);
      setBusy(false);
      isSubmittingRef.current = false;
    }
  }, [open, resource]);

  function handleTypeChange(e) {
    const nextType = e.target.value;
    setType(nextType);
    if (nextType === 'desk') {
      setCapacity(1);
    }
  }

  function handleAmenityToggle(amenity) {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((item) => item !== amenity) : [...prev, amenity]
    );
  }

  function validate() {
    const newErrors = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Name is required';
    }

    if (!type || (type !== 'room' && type !== 'desk')) {
      newErrors.type = 'Type must be room or desk';
    }

    const capNum = Number(capacity);
    if (type === 'desk') {
      // desk forces capacity 1
    } else if (
      capacity === '' ||
      isNaN(capNum) ||
      !Number.isInteger(capNum) ||
      capNum < 1
    ) {
      newErrors.capacity = 'Capacity must be an integer of at least 1';
    }

    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      newErrors.location = 'Location is required';
    }

    if (description && description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }

    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Guard against double submit
    if (busy || isSubmittingRef.current) {
      return;
    }

    setServerAlert(null);
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);

      // Focus first invalid field
      if (validationErrors.name) {
        nameRef.current?.focus();
      } else if (validationErrors.type) {
        typeRef.current?.focus();
      } else if (validationErrors.capacity) {
        capacityRef.current?.focus();
      } else if (validationErrors.location) {
        locationRef.current?.focus();
      } else if (validationErrors.description) {
        descriptionRef.current?.focus();
      }
      return;
    }

    setErrors({});
    setBusy(true);
    isSubmittingRef.current = true;

    const payload = {
      name: name.trim(),
      type,
      capacity: type === 'desk' ? 1 : Number(capacity),
      location: location.trim(),
      amenities,
      description: description.trim(),
    };

    try {
      let response;
      if (isEdit) {
        response = await updateResource(resource._id, payload);
      } else {
        response = await createResource(payload);
      }

      onSuccess?.(response?.data || response);
      onClose?.();
    } catch (err) {
      if (err?.code === 'VALIDATION_ERROR' || err?.status === 400) {
        setServerAlert(err.message || 'Validation failed');
        const fieldErrors = {};
        if (Array.isArray(err.details)) {
          for (const issue of err.details) {
            const field = Array.isArray(issue.path) ? issue.path[0] : issue.path;
            if (field && issue.message) {
              fieldErrors[field] = issue.message;
            }
          }
        } else if (err.details && typeof err.details === 'object') {
          for (const [key, val] of Object.entries(err.details)) {
            fieldErrors[key] = typeof val === 'string' ? val : val?.message;
          }
        }
        setErrors(fieldErrors);
      } else {
        setServerAlert(err?.message || 'Failed to save resource');
      }
    } finally {
      setBusy(false);
      isSubmittingRef.current = false;
    }
  }

  const titleText = isEdit ? 'Edit Resource' : 'New Resource';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleText}
      busy={busy}
      initialFocusRef={nameRef}
      className="max-w-xl"
    >
      {serverAlert && (
        <div
          role="alert"
          data-testid="resource-form-alert"
          className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
        >
          {serverAlert}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor={`${formId}-name`} className="block text-sm font-medium text-ink">
            Name <span className="text-danger">*</span>
          </label>
          <input
            id={`${formId}-name`}
            ref={nameRef}
            type="text"
            value={name}
            disabled={busy}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${formId}-name-error` : undefined}
            className="mt-1 block w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink placeholder-muted focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="e.g. Orion Room"
          />
          {errors.name && (
            <p id={`${formId}-name-error`} className="mt-1 text-xs text-danger">
              {errors.name}
            </p>
          )}
        </div>

        {/* Type & Capacity grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Type */}
          <div>
            <label htmlFor={`${formId}-type`} className="block text-sm font-medium text-ink">
              Type <span className="text-danger">*</span>
            </label>
            <select
              id={`${formId}-type`}
              ref={typeRef}
              value={type}
              disabled={busy}
              onChange={handleTypeChange}
              aria-invalid={Boolean(errors.type)}
              aria-describedby={errors.type ? `${formId}-type-error` : undefined}
              className="mt-1 block w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="room">Room</option>
              <option value="desk">Desk</option>
            </select>
            {errors.type && (
              <p id={`${formId}-type-error`} className="mt-1 text-xs text-danger">
                {errors.type}
              </p>
            )}
          </div>

          {/* Capacity */}
          <div>
            <label htmlFor={`${formId}-capacity`} className="block text-sm font-medium text-ink">
              Capacity <span className="text-danger">*</span>
            </label>
            <input
              id={`${formId}-capacity`}
              ref={capacityRef}
              type="number"
              min="1"
              value={type === 'desk' ? 1 : capacity}
              disabled={busy || type === 'desk'}
              onChange={(e) => {
                if (type !== 'desk') {
                  setCapacity(e.target.value);
                  if (errors.capacity) {
                    setErrors((prev) => ({ ...prev, capacity: undefined }));
                  }
                }
              }}
              aria-invalid={Boolean(errors.capacity)}
              aria-describedby={errors.capacity ? `${formId}-capacity-error` : undefined}
              className="mt-1 block w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink placeholder-muted focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text disabled:cursor-not-allowed disabled:opacity-50"
            />
            {type === 'desk' && (
              <p className="mt-1 text-xs text-muted">Desks have a fixed capacity of 1.</p>
            )}
            {errors.capacity && (
              <p id={`${formId}-capacity-error`} className="mt-1 text-xs text-danger">
                {errors.capacity}
              </p>
            )}
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor={`${formId}-location`} className="block text-sm font-medium text-ink">
            Location <span className="text-danger">*</span>
          </label>
          <input
            id={`${formId}-location`}
            ref={locationRef}
            type="text"
            value={location}
            disabled={busy}
            onChange={(e) => {
              setLocation(e.target.value);
              if (errors.location) {
                setErrors((prev) => ({ ...prev, location: undefined }));
              }
            }}
            aria-invalid={Boolean(errors.location)}
            aria-describedby={errors.location ? `${formId}-location-error` : undefined}
            className="mt-1 block w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink placeholder-muted focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="e.g. Floor 2, Building A"
          />
          {errors.location && (
            <p id={`${formId}-location-error`} className="mt-1 text-xs text-danger">
              {errors.location}
            </p>
          )}
        </div>

        {/* Amenities */}
        <fieldset disabled={busy}>
          <legend className="block text-sm font-medium text-ink mb-2">Amenities</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AMENITIES.map((amenity) => {
              const checked = amenities.includes(amenity);
              const amenityId = `${formId}-amenity-${amenity.toLowerCase().replace(/\s+/g, '-')}`;
              return (
                <label
                  key={amenity}
                  htmlFor={amenityId}
                  className={`flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs transition-colors cursor-pointer select-none ${
                    checked
                      ? 'border-brand-text/50 bg-panel-2 text-ink'
                      : 'border-line bg-panel text-muted hover:border-muted/50 hover:text-ink'
                  }`}
                >
                  <input
                    id={amenityId}
                    type="checkbox"
                    checked={checked}
                    disabled={busy}
                    onChange={() => handleAmenityToggle(amenity)}
                    className="rounded border-line bg-panel text-brand focus:ring-brand-text"
                  />
                  <span className="font-mono">{amenity}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor={`${formId}-description`} className="block text-sm font-medium text-ink">
              Description <span className="text-xs text-muted font-normal">(optional)</span>
            </label>
            <span className="text-xs font-mono text-muted">{description.length}/500</span>
          </div>
          <textarea
            id={`${formId}-description`}
            ref={descriptionRef}
            rows={3}
            maxLength={500}
            value={description}
            disabled={busy}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) {
                setErrors((prev) => ({ ...prev, description: undefined }));
              }
            }}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? `${formId}-description-error` : undefined}
            className="mt-1 block w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink placeholder-muted focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Additional details about equipment, setup or access..."
          />
          {errors.description && (
            <p id={`${formId}-description-error`} className="mt-1 text-xs text-danger">
              {errors.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-line bg-panel-2 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-line/40 focus:outline-none focus:ring-2 focus:ring-brand-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Saving...' : isEdit ? 'Save changes' : 'Create resource'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
