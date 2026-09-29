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
