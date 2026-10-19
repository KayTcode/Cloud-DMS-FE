import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { withRouter, Link } from 'react-router-dom';
import { connect } from 'react-redux';

import { Loading, loadingAction } from '../Loading';
import LoginForm from './component/LoginForm';
import { ModalFails } from './component/Modal';

import { login } from './api';
import { storeAuthLogin } from './redux/action';

import './style.scss';

class Login extends Component {
  static propTypes = {
    history: PropTypes.any.isRequired,
    loadingAction: PropTypes.func.isRequired,
    storeAuthLogin: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      errorMessage: '',
      open: false,
    };
  }

  componentDidMount() {
    const token = localStorage.getItem('accessToken');

    if (token) {
      this.props.history.push('/dashboard');
    }
  }

  handleCloseModal = () => {
    this.setState({
      open: false,
    });
  };

  handleResend = () => {
    console.log('send email again.');
  };

  handleSubmit = async (values) => {
    const {
      history,
      loadingAction,
      storeAuthLogin,
    } = this.props;

    this.setState({
      errorMessage: '',
    });

    try {
      const response = await loadingAction(
        () => login(values)
      );

      localStorage.setItem(
        'accessToken',
        response.accessToken
      );

      localStorage.setItem(
        'expiresAt',
        response.expiresAt
      );

      storeAuthLogin(response);

      history.push('/dashboard');
    } catch (error) {
      this.setState({
        errorMessage:
          error.message ||
          'Login failed. Please try again.',
      });
    }
  };

  render() {
    const {
      errorMessage,
      open,
    } = this.state;

    return (
      <div className="login-page">

        <div className="login-page__background" />

        <div className="login-card">

          <div className="login-card__brand">

            <div className="login-card__logo">
              C
            </div>

            <div>
              <h1>CloudDMS</h1>

              <p>
                Enterprise Multi-Cloud Storage
              </p>
            </div>

          </div>

          <div className="login-card__content">

            <h2>
              Welcome back
            </h2>

            <p className="login-card__subtitle">
              Sign in to your CloudDMS account
            </p>

            {errorMessage && (
              <div className="login-error">
                {errorMessage}
              </div>
            )}

            <LoginForm
              onSubmit={this.handleSubmit}
            />

            <div className="login-links">
              <Link to="/forgot-password">
                Forgot password?
              </Link>
            </div>

          </div>

          <div className="login-card__footer">
            CloudDMS Â© 2026
          </div>

        </div>

        <Loading />

        <ModalFails
          open={open}
          handleCloseModal={
            this.handleCloseModal
          }
          handleResend={
            this.handleResend
          }
        />

      </div>
    );
  }
}

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      loadingAction,
      storeAuthLogin,
    },
    dispatch
  );

export default withRouter(
  connect(
    null,
    mapDispatchToProps
  )(Login)
);