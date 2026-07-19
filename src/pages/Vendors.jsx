import React from "react";
import CrudPage from "@/components/CrudPage";
import { Truck } from "lucide-react";

export default function Vendors() {
  return (
    <CrudPage
      entityName="Vendor"
      title="Vendor Management"
      subtitle="Supplier and contractor registry"
      icon={Truck}
      searchKeys={["name", "category", "contact_person", "email", "phone", "status"]}
      columns={[
        { key: "name", label: "Vendor" },
        { key: "category", label: "Category" },
        { key: "contact_person", label: "Contact" },
        { key: "phone", label: "Phone" },
        { key: "rating", label: "Rating" },
        { key: "status", label: "Status" },
      ]}
      defaultForm={{
        name: "", category: "Other", contact_person: "", email: "",
        phone: "", status: "Active", rating: 3, contract_value: 0,
        address: "", tax_id: "",
      }}
      formFields={[
        { name: "name", label: "Vendor Name", required: true, placeholder: "MedSupply Co." },
        { name: "category", label: "Category", type: "select", options: ["Medical Supplies", "Equipment", "Pharmaceuticals", "Laboratory", "IT Services", "Facilities", "Other"] },
        { name: "contact_person", label: "Contact Person", placeholder: "Jane Smith" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone", placeholder: "+1 234 567 8900" },
        { name: "status", label: "Status", type: "select", options: ["Active", "Inactive", "Suspended", "Pending"] },
        { name: "rating", label: "Rating (1-5)", type: "number" },
        { name: "contract_value", label: "Contract Value", type: "number" },
        { name: "tax_id", label: "Tax ID" },
        { name: "address", label: "Address", type: "textarea" },
      ]}
    />
  );
}