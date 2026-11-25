import type {
  AllergyType,
  Appointment,
  AppointmentStatus,
  Clinic,
  Patient,
  PatientAllergy,
  Provider,
} from "@/domain/entities";

export const seedClinics: Clinic[] = [
  {
    id: "c1",
    name: "Downtown Health",
    location: "12 Main St, Springfield",
    phoneNumber: "+1 555 0100",
  },
  {
    id: "c2",
    name: "Northside Family Clinic",
    location: "88 Oak Ave, Springfield",
    phoneNumber: "+1 555 0200",
  },
];

export const seedProviders: Provider[] = [
  {
    id: "pr1",
    clinicId: "c1",
    firstName: "Alice",
    lastName: "Moreno",
    specialty: "General Practice",
    fee: 2500,
    gender: "FEMALE",
    verificationStatus: "VERIFIED",
  },
  {
    id: "pr2",
    clinicId: "c1",
    firstName: "Ben",
    lastName: "Okafor",
    specialty: "Cardiology",
    fee: 3500.5,
    gender: "MALE",
    verificationStatus: "VERIFIED",
  },
  {
    id: "pr3",
    clinicId: "c2",
    firstName: "Chen",
    lastName: "Li",
    specialty: "Pediatrics",
    fee: null,
    gender: null,
    verificationStatus: "PENDING",
  },
  // Verified at Northside.
  {
    id: "pr4",
    clinicId: "c2",
    firstName: "Sam",
    lastName: "Rivera",
    specialty: "Dermatology",
    fee: 1800,
    gender: "OTHER",
    verificationStatus: "VERIFIED",
  },
];

export const seedPatients: Patient[] = [
  {
    id: "p1",
    firstName: "Dana",
    lastName: "Fischer",
    dateOfBirth: "1988-04-12",
    email: "dana@example.com",
    phoneNumber: "+1 555 1001",
  },
  {
    id: "p2",
    firstName: "Eli",
    lastName: "Grant",
    dateOfBirth: "1975-11-30",
    email: "eli@example.com",
    phoneNumber: "+1 555 1002",
  },
  {
    id: "p3",
    firstName: "Farah",
    lastName: "Haddad",
    dateOfBirth: "2015-06-05",
    email: "farah.parent@example.com",
    phoneNumber: "+1 555 1003",
  },
];

export const seedAllergyTypes: AllergyType[] = [
  { id: "a1", name: "Penicillin" },
  { id: "a2", name: "Peanuts" },
  { id: "a3", name: "Latex" },
  { id: "a4", name: "Pollen" },
];

export const seedPatientAllergies: PatientAllergy[] = [
  {
    patientId: "p1",
    allergyId: "a1",
    severity: "SEVERE",
    notes: "Hives and swelling in 2019",
  },
  {
    patientId: "p3",
    allergyId: "a2",
    severity: "SEVERE",
    notes: "Carries EpiPen",
  },
];

const fixedAppointments: Appointment[] = [
  {
    id: "ap1",
    patientId: "p1",
    providerId: "pr1",
    appointmentDateTime: "2026-11-20T09:30",
    reasonForVisit: "Annual check-up",
    status: "COMPLETED",
  },
  {
    id: "ap2",
    patientId: "p2",
    providerId: "pr2",
    appointmentDateTime: "2026-11-21T14:00",
    reasonForVisit: "Chest pain follow-up",
    status: "COMPLETED",
  },
  {
    id: "ap3",
    patientId: "p3",
    providerId: "pr3",
    appointmentDateTime: "2026-11-24T10:15",
    reasonForVisit: "Vaccination",
    status: "REQUESTED",
  },
];

/** "YYYY-MM-DD" of the local day `offset` days from today. */
function dayKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * An appointment `offset` days from today. The date is a getter, so it is
 * read only when the mock store first clones the seed, never at import time
 * (a module-level Date would run during prerender).
 */
function onDay(
  offset: number,
  time: string,
  appointment: Omit<Appointment, "appointmentDateTime" | "status"> & {
    status?: AppointmentStatus;
  },
): Appointment {
  return {
    ...appointment,
    // Most seeded appointments are confirmed; exceptions name their status.
    status: appointment.status ?? "CONFIRMED",
    get appointmentDateTime() {
      return `${dayKey(offset)}T${time}`;
    },
  };
}

const relativeAppointments: Appointment[] = [
  // Today
  onDay(0, "08:00", {
    id: "ap4",
    patientId: "p1",
    providerId: "pr1",
    reasonForVisit: "Blood pressure check",
  }),
  onDay(0, "08:30", {
    id: "ap5",
    status: "REQUESTED",
    patientId: "p2",
    providerId: "pr2",
    reasonForVisit: "Chest pain follow-up",
  }),
  onDay(0, "09:30", {
    id: "ap6",
    patientId: "p3",
    providerId: "pr1",
    reasonForVisit: "Annual check-up",
  }),
  onDay(0, "10:00", {
    id: "ap7",
    patientId: "p3",
    providerId: "pr3",
    reasonForVisit: "Vaccination",
  }),
  onDay(0, "11:00", {
    id: "ap8",
    patientId: "p1",
    providerId: "pr2",
    reasonForVisit: "ECG results review",
  }),
  onDay(0, "13:00", {
    id: "ap9",
    status: "DECLINED",
    patientId: "p2",
    providerId: "pr1",
    reasonForVisit: "Medication review",
  }),
  onDay(0, "14:00", {
    id: "ap10",
    patientId: "p2",
    providerId: "pr2",
    reasonForVisit: "Stress test follow-up",
  }),
  onDay(0, "15:30", {
    id: "ap11",
    patientId: "p1",
    providerId: "pr1",
    reasonForVisit: "Lab results",
  }),
  // Tomorrow
  onDay(1, "09:00", {
    id: "ap12",
    status: "REQUESTED",
    patientId: "p2",
    providerId: "pr1",
    reasonForVisit: "Diabetes review",
  }),
  onDay(1, "09:30", {
    id: "ap13",
    patientId: "p1",
    providerId: "pr2",
    reasonForVisit: "Palpitations",
  }),
  onDay(1, "10:30", {
    id: "ap14",
    status: "CANCELLED",
    patientId: "p3",
    providerId: "pr3",
    reasonForVisit: "Ear infection",
  }),
  onDay(1, "11:00", {
    id: "ap15",
    patientId: "p1",
    providerId: "pr1",
    reasonForVisit: "Prescription refill",
  }),
  onDay(1, "13:30", {
    id: "ap16",
    patientId: "p2",
    providerId: "pr2",
    reasonForVisit: "Blood pressure monitoring",
  }),
  // In two days
  onDay(2, "08:30", {
    id: "ap17",
    patientId: "p3",
    providerId: "pr1",
    reasonForVisit: "Wellness visit",
  }),
  onDay(2, "10:00", {
    id: "ap18",
    patientId: "p1",
    providerId: "pr2",
    reasonForVisit: "Heart murmur assessment",
  }),
  onDay(2, "14:00", {
    id: "ap19",
    patientId: "p2",
    providerId: "pr1",
    reasonForVisit: "Lab results",
  }),
  // In three days
  onDay(3, "09:15", {
    id: "ap20",
    patientId: "p1",
    providerId: "pr1",
    reasonForVisit: "Skin rash",
  }),
  onDay(3, "11:00", {
    id: "ap21",
    patientId: "p2",
    providerId: "pr2",
    reasonForVisit: "Cardiology consult",
  }),
  onDay(3, "15:00", {
    id: "ap22",
    patientId: "p3",
    providerId: "pr3",
    reasonForVisit: "Allergy review",
  }),
  // Yesterday
  onDay(-1, "10:00", {
    id: "ap23",
    status: "COMPLETED",
    patientId: "p1",
    providerId: "pr1",
    reasonForVisit: "Follow-up visit",
  }),
  onDay(-1, "12:00", {
    id: "ap24",
    status: "COMPLETED",
    patientId: "p2",
    providerId: "pr2",
    reasonForVisit: "Echo results",
  }),
];

export const seedAppointments: Appointment[] = [
  ...fixedAppointments,
  ...relativeAppointments,
];
