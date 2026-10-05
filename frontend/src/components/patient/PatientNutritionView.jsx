import React from 'react';
import { Utensils, Calendar, ShieldCheck, Heart, AlertCircle } from 'lucide-react';

export default function PatientNutritionView({
  nutritionPlans = [],
}) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#e9e2d5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-[#1e1b14]">
              Nutrition & Dietary Care Plans
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-[#f4ede0] text-[#645e45] rounded-full border border-[#e0d9cc]">
              {nutritionPlans.length} Assigned Plans
            </span>
          </div>
          <p className="text-xs text-[#7b776c] font-medium mt-0.5">
            Palliative nutrition guidance, fluid recommendations, and customized dietary instructions
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fdfbf7] border border-[#e0d9cc] text-xs font-bold text-[#645e45]">
          <ShieldCheck className="w-4 h-4" />
          <span>Formulated by Clinical Team</span>
        </div>
      </div>

      {/* Plans List */}
      {nutritionPlans.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e9e2d5] text-center space-y-2 shadow-2xs">
          <Utensils className="w-10 h-10 text-[#645e45] mx-auto opacity-70" />
          <h4 className="font-extrabold text-base text-[#1e1b14]">
            No Nutrition Plan Assigned
          </h4>
          <p className="text-xs text-[#7b776c] max-w-sm mx-auto">
            Your physician or palliative care nutritionist will formulate and attach a customized dietary plan as part of your care regime.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {nutritionPlans.map((plan) => (
            <div
              key={plan.plan_id}
              className="bg-white rounded-2xl border border-[#e9e2d5] p-6 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#f2ece1]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#f4ede0] text-[#645e45] border border-[#e0d9cc]">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[#1e1b14]">
                      Nutrition Plan Version {plan.version_number}
                    </h3>
                    <p className="text-xs text-[#7b776c]">
                      Prescribed by {plan.doctor_name} on {plan.created_at}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                    plan.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                >
                  {plan.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1.5">
                  <h4 className="font-extrabold text-[#645e45] uppercase text-[10px]">
                    Dietary Recommendations
                  </h4>
                  <p className="text-[#1e1b14] leading-relaxed font-medium">
                    {plan.dietary_recommendations || 'Standard soft diet and regular hydration.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1.5">
                  <h4 className="font-extrabold text-[#645e45] uppercase text-[10px]">
                    Special Instructions & Restrictions
                  </h4>
                  <p className="text-[#1e1b14] leading-relaxed font-medium">
                    {plan.special_instructions || 'Take light frequent meals. Avoid spicy or hard foods.'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
