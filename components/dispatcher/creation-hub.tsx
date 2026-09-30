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
    schedule_hub_id: string | null;
    schedule_day: number;
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

export default function DispatcherCreationHub(props: Props) {
  const [choice, setChoice] = useState<"task" | "ticket" | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    function handleBack(event: Event) {
      const customEvent = event as CustomEvent<{ handled?: boolean }>;
      queueMicrotask(() => {
        if (customEvent.detail?.handled) return;
        setChoice(null);
        setCreateOpen(false);
      });
    }

    window.addEventListener("movent:dispatcher-back", handleBack);
    window.dispatchEvent(
      new CustomEvent("movent:dispatcher-create", {
        detail: { active: Boolean(choice) },
      }),
    );

    return () => {
      window.removeEventListener("movent:dispatcher-back", handleBack);
      window.dispatchEvent(
        new CustomEvent("movent:dispatcher-create", {
          detail: { active: false },
        }),
      );
    };
  }, [choice]);

  if (choice) {
    return (
      <section className="section-block dispatcher-create-flow">
        {choice === "task" ? (
          <DispatcherCreateTask
            schedules={props.schedules}
            executors={props.executors}
            fleets={props.fleets}
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
    );
  }

  return (
    <>
      {createOpen ? (
        <div className={"dispatcher-create-menu " + (createOpen ? "is-open" : "")} role="menu">
          <button
            type="button"
            className="dispatcher-create-menu-item"
            role="menuitem"
            onClick={() => {
              setCreateOpen(false);
              setChoice("ticket");
            }}
          >
            Ajuin perbaikan
          </button>
          <button
            type="button"
            className="dispatcher-create-menu-item"
            role="menuitem"
            onClick={() => {
              setCreateOpen(false);
              setChoice("task");
            }}
          >
            Buat tugas baru
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className={"dispatcher-fab" + (createOpen ? " is-open" : "")}
        aria-label={createOpen ? "Tutup menu buat baru" : "Buat baru"}
        aria-expanded={createOpen}
        onClick={() => setCreateOpen((current) => !current)}
      >
        <span aria-hidden="true">+</span>
      </button>
    </>
  );
}
