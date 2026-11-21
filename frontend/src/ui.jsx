import { useEffect, useRef } from "react";
import { cop, initials } from "./domain";

const PILL = {
  Activo: "ok",
  Vigente: "ok",
  Aprobada: "ok",
  Suspendido: "warn",
  Pendiente: "warn",
  Inactivo: "bad",
  Rechazada: "bad",
  Finalizado: "neutral",
};

export function Pill({ value }) {
  return <span className={`pill ${PILL[value] ?? "neutral"}`}>{value}</span>;
}

export function Avatar({ name }) {
  return <span className="avatar" aria-hidden="true">{initials(name)}</span>;
}

export function Money({ value, hidden }) {
  if (hidden) return <span aria-label="Valor oculto">••••••</span>;
  return <span>{cop(Number(value))}</span>;
}

export function Modal({ open, title, onClose, onSubmit, submitLabel = "Guardar", children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.();
        }}
      >
        <h2>{title}</h2>
        {children}
        <div className="form-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          {onSubmit ? <button className="btn" type="submit">{submitLabel}</button> : null}
        </div>
      </form>
    </dialog>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return <div className="toast" role="status">{message}</div>;
}
