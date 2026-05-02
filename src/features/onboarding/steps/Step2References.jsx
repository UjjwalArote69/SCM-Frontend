import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

const emptyRef = () => ({
  company: "",
  contact: "",
  phone: "",
  email: "",
  relationship: "",
});

function ReferenceCard({ index, data, onChange, onRemove }) {
  const update = (k) => (e) => onChange({ ...data, [k]: e.target.value });
  return (
    <div className="bg-surface-container-lowest p-6 flex flex-col gap-6 relative shadow-sm rounded-lg overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-border" />
      <div className="flex justify-between items-center border-b border-border pb-4">
        <h3 className="font-semibold text-text text-lg">
          Reference #{index + 1}
        </h3>
        <button
          onClick={onRemove}
          className="text-text-muted hover:text-danger transition-colors p-1 rounded-full hover:bg-danger-soft"
          type="button"
          aria-label="Remove reference"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <Field
          label="Company name"
          value={data.company}
          onChange={update("company")}
        />
        <Field
          label="Contact person"
          value={data.contact}
          onChange={update("contact")}
        />
        <Field
          label="Phone"
          type="tel"
          value={data.phone}
          onChange={update("phone")}
        />
        <Field
          label="Email"
          type="email"
          value={data.email}
          onChange={update("email")}
        />
        <div className="md:col-span-2">
          <Field
            label="Relationship"
            value={data.relationship}
            onChange={update("relationship")}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        {label}
      </label>
      <input
        className="bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary focus:ring-0 px-0 py-2 text-text text-sm w-full transition-colors outline-none"
        {...props}
      />
    </div>
  );
}

export default function Step2References() {
  const [refs, setRefs] = useState([emptyRef(), emptyRef()]);

  const update = (idx) => (next) =>
    setRefs(refs.map((r, i) => (i === idx ? next : r)));
  const remove = (idx) => () =>
    setRefs(refs.filter((_, i) => i !== idx));
  const add = () => refs.length < 5 && setRefs([...refs, emptyRef()]);

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-text">Business References</h2>
        <p className="text-sm text-text-muted mt-1">
          Add up to 5 business references.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {refs.map((ref, i) => (
          <ReferenceCard
            key={i}
            index={i}
            data={ref}
            onChange={update(i)}
            onRemove={remove(i)}
          />
        ))}
        {refs.length < 5 && (
          <button
            type="button"
            onClick={add}
            className="w-full py-4 border-2 border-dashed border-outline-variant bg-surface-container-low hover:bg-surface-alt transition-colors flex items-center justify-center gap-2 text-text-muted font-semibold text-sm rounded-lg"
          >
            <Plus className="h-5 w-5" />
            Add reference
          </button>
        )}
      </div>
    </>
  );
}
