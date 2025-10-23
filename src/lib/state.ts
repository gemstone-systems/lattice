export const registrationState = {
    registered: false,
};
export const setRegistrationState = (newState: boolean) => {
    console.log("setting registration state to", newState);
    const isRegistered = newState;
    if (isRegistered) console.log("shard was registered at", new Date());
    registrationState.registered = newState;
};
export const getRegistrationState = () => {
    return registrationState;
};
