const admin = (req, res, next) => {
    // 'req.user' is already available because 'protect' runs first
    if (req.user && req.user.isAdmin) {
        next(); // Is Admin? Pass.
    } else {
        res.status(401); // Or 403 Forbidden
        throw new Error('Not authorized as an admin');
    }
};

export { admin };