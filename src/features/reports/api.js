import client from "../../api/client.js";

const params = ({ from, to } = {}) => ({ ...(from && { from }), ...(to && { to }) });

export const reportsApi = {
  spendByVendor: (range) =>
    client.get("/reports/spend-by-vendor", { params: params(range) }).then((r) => r.data.data),
  spendByDepartment: (range) =>
    client.get("/reports/spend-by-department", { params: params(range) }).then((r) => r.data.data),
  spendByCategory: (range) =>
    client.get("/reports/spend-by-category", { params: params(range) }).then((r) => r.data.data),
  monthlyTrend: (range) =>
    client.get("/reports/monthly-trend", { params: params(range) }).then((r) => r.data.data),
  pendingApprovals: () =>
    client.get("/reports/pending-approvals").then((r) => r.data.data),
  vendorPerformance: (range) =>
    client.get("/reports/vendor-performance", { params: params(range) }).then((r) => r.data.data),
  funnel: (range) =>
    client.get("/reports/funnel", { params: params(range) }).then((r) => r.data.data),
  cycleTime: (range) =>
    client.get("/reports/cycle-time", { params: params(range) }).then((r) => r.data.data),
};

export default reportsApi;
