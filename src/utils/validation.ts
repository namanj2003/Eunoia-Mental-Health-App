// Email validation
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
};

// Password validation
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }

  return { isValid: true };
};

// Journal entry validation
export const validateJournalEntry = (
  title: string,
  content: string
): { isValid: boolean; errors: { title?: string; content?: string } } => {
  const errors: { title?: string; content?: string } = {};

  if (!title || title.trim().length === 0) {
    errors.title = 'Title is required';
  } else if (title.length > 100) {
    errors.title = 'Title must be less than 100 characters';
  }

  if (!content || content.trim().length === 0) {
    errors.content = 'Please write something in your journal entry';
  } else if (content.length < 10) {
    errors.content = 'Journal entry should be at least 10 characters';
  } else if (content.length > 10000) {
    errors.content = 'Journal entry is too long (max 10,000 characters)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Clean and validate tags
export const validateTags = (tags: string[]): string[] => {
  return tags
    .filter(tag => tag.trim().length > 0)
    .map(tag => tag.trim().toLowerCase())
    .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
    .slice(0, 5); // Max 5 tags
};

// Name validation
export const validateName = (name: string): { isValid: boolean; error?: string } => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Name is required' };
  }

  if (name.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }

  if (name.length > 50) {
    return { isValid: false, error: 'Name is too long' };
  }

  return { isValid: true };
};

// Mood value validation
export const validateMoodValue = (mood: number): boolean => {
  return mood >= 1 && mood <= 10 && Number.isInteger(mood);
};
