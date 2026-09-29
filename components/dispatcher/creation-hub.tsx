"use client";

import { useEffect, useState } from "react";
import DispatcherCreateTask from "@/components/dispatcher/create-task";
import DispatcherMaintenanceForm from "@/components/dispatcher/maintenance-form";

type Props = {
  locations: string[];
  schedules: Array<{
    schedule_id: string;
    route: string;
    category: string;
    start_point: string;
    destination: string;
    std: string;
    sta: string;
    trip: number;
  }>;
  executors: Array<{ executor_nik: string; full_name: string }>;
  fleets: Array<{ plat_number: string; fleet_type: string }>;
  products: string[];
  maintenanceLists: string[];
  tickets: Array<{
    transaction_id: string;
    status: string;
    maintenance_list: string | null;
    location: string | null;
    fleet_plat_number: string | null;
    created_at: string;
    created_by: string;
    cancellation_note: string | null;
  }>;
};

function DispatcherCreateMenu({
  onSelect,
}: {
  onSelect: (choice: "task" | "ticket") => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }

    window.addEventListener("dispatcher:create-open", handleOpen);
    return () =>
      window.removeEventListener("dispatcher:create-open", handleOpen);
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open]);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="dispatcher-create-backdrop"
          aria-label="Tutup menu buat baru"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={
          "dispatcher-create-menu " + (open ? "is-open" : "")
        }
        aria-hidden={!open}
      >
        <div className="dispatcher-create-menu-head">
          <strong>Buat baru</strong>
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <button
          type="button"
          className="dispatcher-create-menu-item"
          onClick={() => {
            setOpen(false);
            onSelect("task");
          }}
        >
          <span className="dispatcher-create-menu-plus">+</span>
          <span>
            <strong>Penugasan</strong>
            <small>Buat penugasan baru</small>
          </span>
        </button>

        <button
          type="button"
          className="dispatcher-create-menu-item"
          onClick={() => {
            setOpen(false);
            onSelect("ticket");
          }}
        >
          <span className="dispatcher-create-menu-plus">+</span>
          <span>
            <strong>Perbaikan</strong>
            <small>Buat perbaikan baru</small>
          </span>
        </button>
      </aside>
    </>
  );
}

export default function DispatcherCreationHub(props: Props) {
  const [choice, setChoice] = useState<"task" | "ticket" | null>(null);

  return (
    <>
      {choice ? (
        <section className="section-block dispatcher-create-flow">
          <div className="creation-flow-toolbar">
            <div>
              <strong>{choice === "task" ? "Penugasan" : "Perbaikan"}</strong>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setChoice(null)}
            >
              Kembali
            </button>
          </div>

          {choice === "task" ? (
            <DispatcherCreateTask
              locations={props.locations}
              schedules={props.schedules}
              executors={props.executors}
              fleets={props.fleets}
              products={props.products}
            />
          ) : (
            <DispatcherMaintenanceForm
              maintenanceLists={props.maintenanceLists}
              locations={props.locations}
              fleets={props.fleets}
              tickets={props.tickets}
            />
          )}
        </section>
      ) : (
        <>
          <button
            type="button"
            className="dispatcher-fab"
            aria-label="Buat baru"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("dispatcher:create-open"))
            }
          >
            <span aria-hidden="true">+</span>
          </button>
          <DispatcherCreateMenu onSelect={setChoice} />
        </>
      )}
    </>
  );
}
