import axiosInstance from '../api/axios';

export async function getPublicPlans() {
  const { data } = await axiosInstance.get('/api/platform/plans');
  return data.plans || [];
}
