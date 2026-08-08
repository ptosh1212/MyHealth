/**
 * Medical Logic & Search Mapping Utility
 * Maps common symptoms and keywords to clinical specialties.
 */

export const SYMPTOM_SPECIALTY_MAP: Record<string, string> = {
  // General
  'fever': 'General Medicine',
  'cough': 'General Medicine',
  'cold': 'General Medicine',
  'headache': 'Neurology',
  'migraine': 'Neurology',
  'brain': 'Neurology',
  
  // Cardio
  'heart': 'Cardiology',
  'chest pain': 'Cardiology',
  'palpitation': 'Cardiology',
  'blood pressure': 'Cardiology',
  'bp': 'Cardiology',
  
  // Ortho
  'bone': 'Orthopedic',
  'fracture': 'Orthopedic',
  'joint': 'Orthopedic',
  'back pain': 'Orthopedic',
  'knee': 'Orthopedic',
  
  // Pedia
  'child': 'Pediatrics',
  'baby': 'Pediatrics',
  'infant': 'Pediatrics',
  'vaccination': 'Pediatrics',
  
  // Eye / ENT
  'eye': 'Eye / ENT',
  'vision': 'Eye / ENT',
  'ear': 'Eye / ENT',
  'nose': 'Eye / ENT',
  'throat': 'Eye / ENT',
  'sinus': 'Eye / ENT',
  
  // Derma
  'skin': 'Dermatology',
  'rash': 'Dermatology',
  'acne': 'Dermatology',
  'pimple': 'Dermatology',
  'hair': 'Dermatology',
  
  // Dental
  'tooth': 'Dental',
  'teeth': 'Dental',
  'gum': 'Dental',
  'cavity': 'Dental',
};

/**
 * Calculate expected wait time based on queue position.
 * Uses the requested 12-15 min window.
 */
export function calculateWaitTime(aheadCount: number) {
  if (aheadCount <= 0) return 0;
  // Use a weighted average of 14 mins per patient
  return aheadCount * 14;
}

/**
 * Calculate Profile Health Score (0-100)
 */
export function calculateHealthScore(profile: any) {
  let score = 0;
  if (!profile) return 0;
  
  if (profile.name) score += 10;
  if (profile.age) score += 10;
  if (profile.gender) score += 10;
  if (profile.bloodGroup) score += 10;
  if (profile.address) score += 10;
  if (profile.phone) score += 10;
  
  // Critical medical data
  if (profile.allergies && profile.allergies !== 'None') score += 15;
  if (profile.chronicConditions && profile.chronicConditions !== 'None') score += 15;
  
  // Emergency contact
  if (profile.emergencyContact && profile.emergencyName) score += 10;
  
  return Math.min(score, 100);
}