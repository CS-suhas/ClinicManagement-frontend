import { formatDateTime } from "@/lib/format";
import type { Patient, PatientVisit } from "../schemas";
import { patientFullName } from "../utils";

export type ExportableRoster = {
  patient: Patient;
  lastVisit?: PatientVisit | null;
  nextVisit?: PatientVisit | null;
};

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

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

export function mailtoBcc(emails: string[]): string {
  return `mailto:?bcc=${encodeURIComponent(emails.join(","))}`;
}
