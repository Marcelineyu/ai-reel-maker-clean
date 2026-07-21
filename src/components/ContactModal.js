import React, { useCallback, useEffect, useRef, useState } from 'react';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xykrpgzo';

const LIMITS = { name: 100, email: 254, message: 2000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = { name: '', email: '', message: '' };

function validate(values) {
  const errors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (!name) errors.name = 'Please enter your name.';
  else if (name.length > LIMITS.name) errors.name = `Name must be ${LIMITS.name} characters or fewer.`;

  if (!email) errors.email = 'Please enter your email address.';
  else if (email.length > LIMITS.email) errors.email = `Email must be ${LIMITS.email} characters or fewer.`;
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Please enter a valid email address.';

  if (!message) errors.message = 'Please enter a message.';
  else if (message.length > LIMITS.message) errors.message = `Message must be ${LIMITS.message} characters or fewer.`;

  return errors;
}

export default function ContactModal({ open, onClose }) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [submitError, setSubmitError] = useState('');

  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);
  const previouslyFocused = useRef(null);

  const handleClose = useCallback(() => {
    if (status === 'submitting') return;
    onClose?.();
  }, [status, onClose]);

  // Reset transient state whenever the modal is (re)opened, and capture the
  // element to return focus to on close.
  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    setValues(EMPTY_FORM);
    setErrors({});
    setStatus('idle');
    setSubmitError('');

    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 0);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      const target = previouslyFocused.current;
      if (target && typeof target.focus === 'function') target.focus();
    };
  }, [open]);

  // Keyboard handling: Escape to close, Tab to trap focus within the dialog.
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        handleClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]'),
      ).filter((el) => el.tabIndex !== -1 && el.type !== 'hidden' && !el.hidden);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, handleClose]);

  if (!open) return null;

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'submitting') return;

    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setStatus('submitting');
    setSubmitError('');

    try {
      const formData = new FormData(event.target);
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        setStatus('success');
        setValues(EMPTY_FORM);
        return;
      }

      const data = await response.json().catch(() => null);
      const fieldErrors = {};
      if (data && Array.isArray(data.errors)) {
        data.errors.forEach((err) => {
          const field = typeof err.field === 'string' ? err.field.toLowerCase() : '';
          if (field === 'name' || field === 'email' || field === 'message') {
            fieldErrors[field] = err.message || 'This field is invalid.';
          }
        });
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        setStatus('idle');
      } else {
        setStatus('error');
        setSubmitError('Your message could not be sent. Please try again.');
      }
    } catch (err) {
      setStatus('error');
      setSubmitError('Your message could not be sent. Please try again.');
    }
  };

  const isSubmitting = status === 'submitting';
  const describedBy = (field) => (errors[field] ? `contact-${field}-error` : undefined);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center overflow-y-auto p-4 sm:p-6 animate-contact-fade"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="fixed inset-0 bg-text-primary/40 backdrop-blur-[1px]" aria-hidden />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        className="relative w-full max-w-md my-8 sm:my-0 bg-surface border border-border rounded-xl shadow-float animate-contact-panel"
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close contact form"
          className="absolute right-3 top-3 p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-soft transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {status === 'success' ? (
          <div className="px-6 py-8 sm:px-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-soft text-primary">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 id="contact-modal-title" className="mt-4 text-xl font-semibold text-text-primary tracking-tight">
              Message sent
            </h2>
            <p className="mt-2 text-text-secondary leading-relaxed">
              Thanks for reaching out. I&apos;ll get back to you as soon as possible.
            </p>
            <button type="button" onClick={handleClose} className="btn-primary mt-6 w-full">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="px-6 py-7 sm:px-8">
            <input type="hidden" name="_subject" value="New message from AI Reel Maker" />
            <div className="absolute left-[-9999px]" aria-hidden>
              <label htmlFor="contact-gotcha">Leave this field empty</label>
              <input id="contact-gotcha" type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
            </div>

            <h2 id="contact-modal-title" className="text-xl font-semibold text-text-primary tracking-tight pr-8">
              Contact
            </h2>
            <p className="mt-2 text-text-secondary leading-relaxed">
              Have a question, collaboration idea, or feedback about AI Reel Maker? Send me a message and I&apos;ll get back to you.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-text-primary mb-1.5">
                  Name
                </label>
                <input
                  ref={firstFieldRef}
                  id="contact-name"
                  name="name"
                  type="text"
                  value={values.name}
                  onChange={setField('name')}
                  maxLength={LIMITS.name}
                  required
                  autoComplete="name"
                  placeholder="Your name"
                  aria-invalid={errors.name ? 'true' : undefined}
                  aria-describedby={describedBy('name')}
                  className="input-field"
                />
                {errors.name && (
                  <p id="contact-name-error" role="alert" className="mt-1.5 text-sm text-accent-coral">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-text-primary mb-1.5">
                  Email
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={setField('email')}
                  maxLength={LIMITS.email}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={errors.email ? 'true' : undefined}
                  aria-describedby={describedBy('email')}
                  className="input-field"
                />
                {errors.email && (
                  <p id="contact-email-error" role="alert" className="mt-1.5 text-sm text-accent-coral">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-text-primary mb-1.5">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={values.message}
                  onChange={setField('message')}
                  maxLength={LIMITS.message}
                  required
                  rows={5}
                  placeholder="Tell me what you'd like to discuss"
                  aria-invalid={errors.message ? 'true' : undefined}
                  aria-describedby={describedBy('message')}
                  className="input-field resize-y min-h-[120px]"
                />
                {errors.message && (
                  <p id="contact-message-error" role="alert" className="mt-1.5 text-sm text-accent-coral">
                    {errors.message}
                  </p>
                )}
              </div>
            </div>

            {submitError && (
              <p role="alert" className="mt-4 text-sm text-accent-coral bg-surface-soft border border-border rounded-lg px-3 py-2">
                {submitError}
              </p>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary mt-6 w-full">
              {isSubmitting ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
