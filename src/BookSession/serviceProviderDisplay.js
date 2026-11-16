const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function getServiceProviderDisplay(serviceId, serviceName, psychologistName) {
  const id = normalize(serviceId);
  const name = normalize(serviceName);
  const service = `${id}${name}`;

  if (service.includes("psychotherapy")) {
    return {
      summaryLabel: "PSYCHOLOGIST",
      appointmentLabel: "Psychologist",
      value: psychologistName || "—",
    };
  }

  if (id === "aba" || service.includes("abatherapy")) {
    return {
      summaryLabel: "THERAPIST",
      appointmentLabel: "Therapist",
      value: "ABA Therapist",
    };
  }

  if (id === "assessment" || (name.includes("assessment") && name.includes("consultation"))) {
    return {
      summaryLabel: "SPECIALIST",
      appointmentLabel: "Specialist",
      value: "Assessment specialist",
    };
  }

  return {
    summaryLabel: "PROVIDER",
    appointmentLabel: "Provider",
    value: "Assigned by the clinic",
  };
}
