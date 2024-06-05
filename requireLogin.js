function requireLogin(req , res , next){

    if(req.session.email || req.session.id_user){

        return next()
    }
    else{
        res.status(401).send({
            message:"Unauthorized"})
    }
}
export default requireLogin;

