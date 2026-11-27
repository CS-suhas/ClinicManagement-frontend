import { type Patient, patientFullName } from "@/domain/entities";
import type { PatientVisitSummary } from "@/domain/repositories";
import { formatDateTime } from "@/lib/format";

/** One roster line as the export needs it. */
export type ExportableRoster = {
  patient: Patient;
  lastVisit?: PatientVisitSummary | null;
  nextVisit?: PatientVisitSummary | null;
};

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

/** CSV for the selected patients: name, date of birth, contact details and visit times. */
export function rosterToCsv(rows: ExportableRoster[]): string {
  const header = [
    "Name",
    "Date of birth",
    "Email",
    "Phone",
    "Last visit",
    "Next visit",
  ];
  const lines = rows.map((row) =>
    [
      patientFullName(row.patient),
      row.patient.dateOfBirth,
      row.patient.email,
      row.patient.phoneNumber,
      row.lastVisit ? formatDateTime(row.lastVisit.appointmentDateTime) : "",
      row.nextVisit ? formatDateTime(row.nextVisit.appointmentDateTime) : "",
    ]
      .map((cell) => csvCell(String(cell ?? "")))
      .join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\r\n");
}

/** Saves text as a file through a temporary object URL. Browser-only. */
export function downloadText(
  filename: string,
  text: string,
  type = "text/csv",
) {
  const url = URL.createObjectURL(
    new Blob([text], { type: `${type};charset=utf-8` }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** A mailto: link that puts the addresses in Bcc, so recipients do not see each other. */
export function mailtoBcc(emails: string[]): string {
  return `mailto:?bcc=${encodeURIComponent(emails.join(","))}`;
}
