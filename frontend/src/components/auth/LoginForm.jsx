import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import {
  useLocation,
  useNavigate,
} from "react-router";
import toast from "react-hot-toast";

import { login } from "@/services/authService";
import PasswordInput from "./PasswordInput";
import useAuth from "@/hooks/useAuth";

const LoginForm = () => {
  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm();

  const navigate = useNavigate();
  const location = useLocation();

  const { refreshUser } = useAuth();

  const from =
    location.state?.from?.pathname ||
    "/dashboard";

  const onSubmit = async (data) => {
    try {
      const result = await login(data);

      localStorage.setItem(
        "accessToken",
        result.token
      );

      const updatedUser = await refreshUser();
      const role = (result?.user?.role || updatedUser?.role || "").toLowerCase();

      toast.success(result.message);

      const targetPath =
        location.state?.from?.pathname ||
        (role === "admin" ? "/admin" : "/dashboard");

      navigate(targetPath, {
        replace: true,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Login Failed"
      );
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit(onSubmit)}
    >
      {/* Email */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Email
        </label>

        <Input
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          {...register("email", {
            required: "Email is required",
            pattern: {
              value:
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Invalid email",
            },
          })}
        />

        {errors.email && (
          <p className="mt-2 text-sm text-red-500">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">
            Password
          </label>

          <button
            type="button"
            className="text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            Forgot Password?
          </button>
        </div>

        <PasswordInput
          register={register}
          error={errors.password}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="h-11 w-full"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Signing In..."
          : "Login"}
      </Button>
    </form>
  );
};

export default LoginForm;