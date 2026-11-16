import { CLINIC } from "./clinic";

export const DEFAULT_HOME_CONTENT = {
  hero: {
    eyebrow: "A SAFE SPACE FOR WELL-BEING",
    headline: "Professional support for every step of",
    highlight: "your journey",
    subtext:
      "Access compassionate mental health services, professional counseling, therapy, and assessment consultation in a safe and supportive environment.",
    photo: "",
    ctaLabel: "Book an Appointment",
    linkLabel: "Learn how it works",
  },
  steps: [
    { id: "s1", icon: "select", title: "Select your service", text: "Explore and choose from our range of mental health services (Psychotherapy, Counseling, ABA Therapy, Assessment) that best fit your needs." },
    { id: "s2", icon: "calendar", title: "Choose your schedule", text: "Select a convenient date and time for your initial virtual or in-person appointment that works for you." },
    { id: "s3", icon: "connect", title: "Connect with a specialist", text: "Get matched with a licensed therapist or counselor who specializes in your specific area of concern." },
    { id: "s4", icon: "sprout", title: "Start your journey", text: "Attend your scheduled session (in-person or virtual) to begin your path to healing and resilience." },
  ],
  services: [
    { id: "v1", icon: "chat", photo: "/img/service-1.png", meta: "1 Hour Session", title: "Psychotherapy & Counseling", text: "Individual talk therapy sessions designed to enhance self-awareness, explore complex emotions, build deep insight, and develop healthy, resilient coping mechanisms tailored for your daily life." },
    { id: "v2", icon: "blocks", photo: "/img/service-2.png", meta: "2 Hour Intensive Session", title: "ABA Therapy", text: "Structured behavioral interventions applying Applied Behavior Analysis. We focus on intensive skill building, positive reinforcement, and the development of key life behaviors in a supportive, encouraging environment." },
    { id: "v3", icon: "check", photo: "/img/service-3.png", meta: "1 Hour Comprehensive Review", title: "Assessment & Consultation", text: "A thorough initial review and diagnostic structured interview. This provides a holistic understanding of your unique mental health landscape, allowing us to recommend highly tailored, effective approaches just for you." },
  ],
  team: [
    { id: "t1", name: "Dr. Maria Santos", role: "Clinical Psychologist", focus: "Psychotherapy", quote: "A safe space to understand yourself, heal, and grow at your own pace.", bio: "I believe that healing begins when you feel safe, heard, and understood. My goal is to provide a supportive space where you can explore your emotions, overcome challenges, and work toward a healthier and more balanced life.", tags: ["Psychotherapy", "Counseling", "Anxiety"] },
    { id: "t2", name: "Dr. Juan Dela Cruz", role: "Psychotherapist", focus: "Counseling", quote: "Change starts with being heard — we move at a pace that feels right for you.", bio: "I work with adults navigating stress, relationships, and life transitions. Sessions focus on practical tools and a collaborative therapeutic relationship.", tags: ["Psychotherapy", "Counseling", "Relationships"] },
    { id: "t3", name: "Dr. Ana Reyes", role: "Behavioral Specialist", focus: "ABA Therapy", quote: "Small, consistent steps create lasting growth for children and families.", bio: "I specialize in Applied Behavior Analysis for children and teens, partnering with families to build communication, social, and daily living skills.", tags: ["ABA Therapy", "Child & Teen", "Parent coaching"] },
  ],
  stories: [
    { id: "o1", who: "M.C", text: "I felt heard and understood without being judged. The sessions helped me understand my emotions better and gave me confidence in handling life's challenges." },
    { id: "o2", who: "M.C", text: "The experience made me feel comfortable opening up about things I usually keep to myself. I learned to be kinder to myself and take things one step at a time." },
    { id: "o3", who: "M.C", text: "I appreciate having a safe space where I can talk freely. The guidance helped me reflect on my experiences and find healthier ways to cope with stress." },
  ],
  faqs: [
    { id: "f1", q: "Is everything I share confidential?", a: "Yes. Your sessions are private and handled according to professional ethics and applicable privacy laws. Limits to confidentiality are explained before your first session." },
    { id: "f2", q: "Do you offer online and in-person sessions?", a: "Yes. You can choose a virtual or an in-person appointment when you book." },
    { id: "f3", q: "How long is a session, and how many will I need?", a: "Sessions run 1 to 2 hours depending on the service. Your specialist will recommend a plan after your first session." },
    { id: "f4", q: "How do I reschedule or cancel?", a: "Open My appointments, pick the session, and choose a new time or cancel. Please do so in advance when possible." },
    { id: "f5", q: "What if I don't feel like it's the right fit?", a: "That's okay. You can ask to be matched with a different specialist at any time." },
    { id: "f6", q: "Can children and teens be seen?", a: "Yes. Our ABA Therapy and counseling services support children and teens, with parents or guardians involved." },
  ],
  contact: {
    email: CLINIC.email,
    phone: CLINIC.phone,
    address: CLINIC.address,
    facebook: CLINIC.facebook,
    facebookLabel: CLINIC.facebookLabel,
    hours: CLINIC.hours,
  },
};

const LIST_KEYS = ["steps", "services", "team", "stories", "faqs"];
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function mergeHomeContent(data) {
  const d = data || {};
  const out = {
    hero: { ...DEFAULT_HOME_CONTENT.hero, ...(d.hero || {}) },
    contact: { ...DEFAULT_HOME_CONTENT.contact, ...(d.contact || {}) },
  };
  LIST_KEYS.forEach((k) => {
    const list = Array.isArray(d[k]) && d[k].length ? d[k] : DEFAULT_HOME_CONTENT[k];
    out[k] = list.map((item) => ({ ...item, id: item.id || makeId() }));
  });
  return out;
}