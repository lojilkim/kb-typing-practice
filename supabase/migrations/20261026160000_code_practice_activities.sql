CREATE TABLE IF NOT EXISTS public.code_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_number INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.practice_sessions
  ADD COLUMN IF NOT EXISTS code_activity_id UUID REFERENCES public.code_activities(id) ON DELETE SET NULL;

ALTER TABLE public.code_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view code activities" ON public.code_activities;
CREATE POLICY "Anyone can view code activities" ON public.code_activities
  FOR SELECT USING (true);

INSERT INTO public.code_activities (activity_number, title, description, code) VALUES
(1, 'Hello World', 'Practice typing a basic Java program and displaying text.', $$public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        System.out.println("Welcome to Java programming.");
    }
}$$),
(2, 'Variables and Data Types', 'Practice typing variable declarations and common Java data types.', $$public class Main {
    public static void main(String[] args) {
        String name = "Student";
        int age = 17;
        double grade = 95.5;
        boolean isEnrolled = true;

        System.out.println("Name: " + name);
        System.out.println("Age: " + age);
        System.out.println("Grade: " + grade);
        System.out.println("Enrolled: " + isEnrolled);
    }
}$$),
(3, 'Basic Arithmetic', 'Practice typing arithmetic operators and mathematical expressions.', $$public class Main {
    public static void main(String[] args) {
        int a = 10;
        int b = 5;

        System.out.println("Sum: " + (a + b));
        System.out.println("Difference: " + (a - b));
        System.out.println("Product: " + (a * b));
        System.out.println("Quotient: " + (a / b));
        System.out.println("Remainder: " + (a % b));
    }
}$$),
(4, 'If-Else Statements', 'Practice typing conditional statements and comparison operators.', $$public class Main {
    public static void main(String[] args) {
        int score = 85;

        if (score >= 90) {
            System.out.println("Excellent!");
        } else if (score >= 75) {
            System.out.println("Passed!");
        } else {
            System.out.println("Try again.");
        }
    }
}$$),
(5, 'For Loop', 'Practice typing loops and increment operators.', $$public class Main {
    public static void main(String[] args) {
        for (int i = 1; i <= 5; i++) {
            System.out.println("Count: " + i);
        }
    }
}$$),
(6, 'Arrays', 'Practice typing array declarations, indexes, and loops.', $$public class Main {
    public static void main(String[] args) {
        int[] numbers = {10, 20, 30, 40, 50};

        for (int i = 0; i < numbers.length; i++) {
            System.out.println(numbers[i]);
        }
    }
}$$),
(7, 'Methods', 'Practice typing method declarations, parameters, return values, and method calls.', $$public class Main {
    public static int addNumbers(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        int result = addNumbers(10, 20);
        System.out.println("The sum is: " + result);
    }
}$$)
ON CONFLICT (activity_number) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  code = EXCLUDED.code;
