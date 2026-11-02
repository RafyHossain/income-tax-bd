import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import PasswordInput from "./PasswordInput";
import { register as registerUser } from "@/services/authService";

const RegisterForm = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm({
    mode: "onTouched",
  });

  const password = watch("password");

  const onSubmit = async (data) => {
    try {
      delete data.confirmPassword;

      const result = await registerUser(data);

      toast.success(result.message);

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      const serverMessage =
        error.response?.data?.message || "Registration Failed";

      if (
        serverMessage.includes("e-TIN") ||
        serverMessage.includes("tin_number")
      ) {
        setError("tin_number", {
          type: "server",
          message: serverMessage,
        });
      } else if (serverMessage.includes("Email")) {
        setError("email", {
          type: "server",
          message: serverMessage,
        });
      } else if (serverMessage.includes("Phone")) {
        setError("phone", {
          type: "server",
          message: serverMessage,
        });
      } else if (serverMessage.includes("NID")) {
        setError("nid", {
          type: "server",
          message: serverMessage,
        });
      }

      toast.error(serverMessage);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
    >
      {/* Full Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Full Name
        </label>

        <Input
          placeholder="Enter your full name"
          autoComplete="name"
          {...register("full_name", {
            required: "Full name is required",
            minLength: {
              value: 3,
              message: "Minimum 3 characters",
            },
          })}
        />

        {errors.full_name && (
          <p className="mt-2 text-sm text-red-500">
            {errors.full_name.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Email
        </label>

        <Input
          type="email"
          placeholder="Enter your email"
          autoComplete="email"
          {...register("email", {
            required: "Email is required",
          })}
        />

        {errors.email && (
          <p className="mt-2 text-sm text-red-500">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Phone
        </label>

        <Input
          type="tel"
          placeholder="01XXXXXXXXX"
          autoComplete="tel"
          {...register("phone", {
            required: "Phone is required",
          })}
        />

        {errors.phone && (
          <p className="mt-2 text-sm text-red-500">
            {errors.phone.message}
          </p>
        )}
      </div>

      {/* NID */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          NID
        </label>

        <Input
          placeholder="National ID"
          inputMode="numeric"
          {...register("nid", {
            required: "NID is required",
          })}
        />

        {errors.nid && (
          <p className="mt-2 text-sm text-red-500">
            {errors.nid.message}
          </p>
        )}
      </div>

      {/* e-TIN Number (12 Digits) */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          e-TIN Number (12 Digits)
        </label>

        <Input
          placeholder="Enter your 12-digit e-TIN"
          inputMode="numeric"
          maxLength={12}
          {...register("tin_number", {
            required: "e-TIN number is required.",
            pattern: {
              value: /^[0-9]{12}$/,
              message: "e-TIN must contain exactly 12 digits.",
            },
            validate: {
              exactLength: (val) =>
                val?.trim()?.length === 12 ||
                "e-TIN must contain exactly 12 digits.",
              numericOnly: (val) =>
                /^\d+$/.test(val?.trim() || "") ||
                "e-TIN must contain numeric digits only.",
            },
          })}
        />

        {errors.tin_number && (
          <p className="mt-2 text-sm text-red-500">
            {errors.tin_number.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Password
        </label>

        <PasswordInput
          register={register}
          error={errors.password}
        />
      </div>

      {/* Confirm Password */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Confirm Password
        </label>

        <Input
          type="password"
          placeholder="Confirm password"
          autoComplete="new-password"
          {...register("confirmPassword", {
            required: "Confirm password is required",
            validate: (value) =>
              value === password || "Passwords do not match",
          })}
        />

        {errors.confirmPassword && (
          <p className="mt-2 text-sm text-red-500">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="h-11 w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating..." : "Create Account"}
      </Button>
    </form>
  );
};

export default RegisterForm;
