"use client";

import { useState } from "react";
import DispatcherCreateTask from "@/components/dispatcher/create-task";
import DispatcherMaintenanceForm from "@/components/dispatcher/maintenance-form";

type Props = {
  locations: string[];
  locationGroups: Array<{ location: string; grouping: string | null }>;
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

export default function DispatcherCreationHub(props: Props) {
  const [choice, setChoice] = useState<"task" | "ticket" | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  if (choice) {
    return (
      <section className="section-block dispatcher-create-flow">
        <button
          type="button"
          className="dispatcher-back-button"
          onClick={() => setChoice(null)}
          aria-label="Kembali"
          title="Kembali"
        >
          <span aria-hidden="true">←</span>
        </button>

        {choice === "task" ? (
          <DispatcherCreateTask
            locationGroups={props.locationGroups}
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
