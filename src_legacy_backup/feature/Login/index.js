import Login from './Container';
import authReducer from './redux/reducer';
import { storeAuthLogin } from './redux/action';
import Kyc from './Kyc';

export default Login;

export {
  authReducer,
  storeAuthLogin,
};
