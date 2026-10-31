import { z } from 'zod'

/** the password step of /login: an empty or malformed field is caught here, wrong credentials by Supabase */
export const loginFormSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})
