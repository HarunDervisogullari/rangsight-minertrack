"use client";
import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Link from "next/link";

const SignUpForm: React.FC = () => {
  const router = useRouter();

  // Existing fields
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  // New fields
  const [name, setName] = useState<string>("");
  const [surname, setSurname] = useState<string>("");
  const [position, setPosition] = useState<string>("Supervisor");
  const [department, setDepartment] = useState<string>("Operations");
  const [contact, setContact] = useState<string>("");

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Sample position/department options for a mining organization
  const positionOptions = ["Supervisor", "Manager", "Engineer", "Technician", "Worker"];
  const departmentOptions = ["Operations", "Safety", "Maintenance", "Administration", "HR"];

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = {
      username,
      email,
      password,
      role: "user", // default role
      name,
      surname,
      position,
      department,
      contact,
    };

    try {
      const response = await fetch("http://localhost:8000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok) {
        localStorage.setItem("token", result.token);
        setSuccessMessage("Successfully created your account! Redirecting to Sign In...");
        setTimeout(() => {
          router.push("/signin");
        }, 2000);
      } else {
        setError(result.error || "Failed to sign up");
      }
    } catch (err) {
      setError("Error connecting to server");
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your details to sign up!
            </p>
          </div>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          {successMessage && <p className="text-green-500 text-sm mb-3">{successMessage}</p>}

          <form onSubmit={handleSignUp}>
            <div className="space-y-6">
              {/* Username */}
              <div>
                <Label>
                  Username <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setUsername(e.target.value)
                  }
                />
              </div>

              {/* Email */}
              <div>
                <Label>
                  Email <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="info@gmail.com"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                />
              </div>

              {/* Password */}
              <div>
                <Label>
                  Password <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 text-gray-500 dark:text-gray-400"
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </span>
                </div>
              </div>

              {/* Name */}
              <div>
                <Label>
                  Name <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="John"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                />
              </div>

              {/* Surname */}
              <div>
                <Label>
                  Surname <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Doe"
                  value={surname}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSurname(e.target.value)
                  }
                />
              </div>

              {/* Position (Dropdown) */}
              <div>
                <Label>
                  Position <span className="text-error-500">*</span>
                </Label>
                <select
                  className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs dark:bg-gray-900 dark:text-white/90"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                >
                  {positionOptions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department (Dropdown) */}
              <div>
                <Label>
                  Department <span className="text-error-500">*</span>
                </Label>
                <select
                  className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs dark:bg-gray-900 dark:text-white/90"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact */}
              <div>
                <Label>Contact</Label>
                <Input
                  type="text"
                  placeholder="+1 555 555 5555"
                  value={contact}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setContact(e.target.value)
                  }
                />
              </div>

              {/* Terms & Conditions Checkbox */}
              <div className="flex items-center gap-3">
                <Checkbox checked={isChecked} onChange={setIsChecked} />
                <p className="block font-normal text-gray-500 dark:text-gray-400 text-sm">
                  By creating an account you agree to our{" "}
                  <span className="text-gray-800 dark:text-white/90">
                    Terms and Conditions
                  </span>{" "}
                  and our{" "}
                  <span className="text-gray-800 dark:text-white">
                    Privacy Policy
                  </span>
                </p>
              </div>

              <div>
                <Button type="submit" className="w-full" size="sm">
                  Sign Up
                </Button>
              </div>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpForm;
