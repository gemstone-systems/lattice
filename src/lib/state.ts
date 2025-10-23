export const registrationState = {
    registered: false,
};
export const setRegistrationState = (newState: boolean) => {
    registrationState.registered = newState;
};
export const getRegistrationState = () => {
    return registrationState;
};
