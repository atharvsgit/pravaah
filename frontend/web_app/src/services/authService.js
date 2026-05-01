import api from '../utils/api';

// Map UI selection to backend roles
const mapUserTypeToRole = (userType) => {
  const mapping = {
    citizen: 'citizen',
    official: 'official',
    analyst: 'analyst',
  };
  return mapping[userType] || 'citizen';
};

export const register = async ({ email, full_name, phone, password, userType }) => {
  const payload = {
    email,
    full_name,
    phone,
    password,
    role: mapUserTypeToRole(userType),
  };
  
  console.log('🔐 AuthService: Registering user with payload:', {
    ...payload,
    password: '[REDACTED]'
  });
  console.log('🔐 AuthService: Making POST request to /auth/register');
  
  try {
    const startTime = Date.now();
    
    // Add explicit timeout for registration (30 seconds)
    const { data } = await api.post('/auth/register', payload, {
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ AuthService: Registration successful in ${elapsed}ms:`, data);
    
    return data;
  } catch (error) {
    console.error('❌ AuthService: Registration failed:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
    });
    
    // Provide better error messages
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Registration timed out. The server might be slow - please try again.');
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data.detail || 'Registration failed. Please check your details.');
    } else if (error.response?.status === 504) {
      throw new Error('Server timeout. Please try again in a moment.');
    } else if (!error.response) {
      throw new Error('Cannot connect to server. Please check your internet connection.');
    }
    
    throw error;
  }
};

export const login = async ({ email, password }) => {
  console.log('🔑 AuthService: Logging in user:', email);
  
  try {
    const startTime = Date.now();
    
    // OAuth2PasswordRequestForm expects x-www-form-urlencoded with username=password
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    
    const { data } = await api.post('/auth/login', form, {
      timeout: 20000, // 20 seconds
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ AuthService: Login successful in ${elapsed}ms`);
    
    return data; // { access_token, token_type }
  } catch (error) {
    console.error('❌ AuthService: Login failed:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
    });
    
    // Provide better error messages
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Login timed out. The server might be slow - please try again.');
    } else if (error.response?.status === 401) {
      throw new Error('Incorrect email or password.');
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data.detail || 'Login failed.');
    } else if (error.response?.status === 504) {
      throw new Error('Server timeout. Please try again in a moment.');
    } else if (!error.response) {
      throw new Error('Cannot connect to server. Please check your internet connection.');
    }
    
    throw error;
  }
};