export const STUDENT_FACULTY_OPTIONS = [
  { value: "IT", label: "Computing" },
  { value: "ENGINEERING", label: "Engineering" },
  { value: "BUSINESS", label: "Business" },
  { value: "MEDICINE", label: "Medicine" },
];

export const ADMIN_TARGET_FACULTY_OPTIONS = [
  { value: "ALL", label: "All Faculties" },
  ...STUDENT_FACULTY_OPTIONS,
];

export function normalizeFacultyId(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "";
  if (normalized === "COMPUTING") return "IT";
  return normalized;
}

export function formatFacultyLabel(facultyId) {
  const normalized = normalizeFacultyId(facultyId);
  const found = ADMIN_TARGET_FACULTY_OPTIONS.find((option) => option.value === normalized);
  return found ? found.label : normalized || "Unknown";
}
