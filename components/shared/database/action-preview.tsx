"use client";

import { showToast } from "@/components/shared/toast-provider";

import { cloneElement, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from "react";

export default function DatabaseActionPreview({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  function wrapForm(node: ReactNode) {
    if (!isValidElement(node) || node.type !== "form") return node;
    const form = node as ReactElement<{ action?: (formData: FormData) => Promise<{ success?: string; error?: string } | void> }>;
    const action = form.props.action;
    if (typeof action !== "function") return node;
    return cloneElement(form, {
      action: async (formData: FormData) => {
        const result = await action(formData);
        if (result && "success" in result && result.success) { showToast(result.success); window.setTimeout(() => setOpen(false), 650); }
        return result;
      },
    });
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="database-action-card"
        onClick={() => setOpen(true)}
      >
        <span>{title}</span>
        <small>+</small>
      </button>

      {open ? (
        <div
          className="database-action-modal-backdrop"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="database-action-modal"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="database-action-modal-heading">
              <div>
                <h2>{title}</h2>
                <p>
                  Kelola data{" "}
                  <strong>
                    {" "}
                    {title === "Tambah pengguna"
                      ? "satu per satu"
                      : "secara massal"}
                  </strong>{" "}
                  di sini.
                </p>
              </div>
              <button
                type="button"
                className="database-action-modal-close"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
            <div className="database-action-modal-body">{wrapForm(children)}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
