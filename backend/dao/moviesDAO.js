import { query } from "express"
import mongodb, { ObjectId } from "mongodb"

let movies

export default class MoviesDAO {
    static async injectDB(conn){
        if(movies) {
            return
        }
        try{
            movies= await conn.db(process.env.MOVIEREVIEWS_NS)
            .collection('movies')
        }
        catch(e) {
            console.error(`unable to connect in MoviesDAO:${e}`)
        }
    }
    //retrieving movies
    static async getMovies({
        filters= null,
        page= 0,
        moviesPerPage= 20, //will only get 20 movies at once
    
    }={}) {
        let query
        if(filters) {
            if('title' in filters) {
                query = {$text: {$search: filters['title']}}
            } else if('rated' in filters) {
                query = {'rated': {$eq: filters['rated']}}
            }
        }
    let cursor
    try {
        cursor= await movies
        .find(query)
        .limit(moviesPerPage)
        .skip(moviesPerPage*page)
        const moviesList = await cursor.toArray()
        const totalNumMovies = await movies.countDocuments(query)
        return {moviesList, totalNumMovies}
    }
    catch(e){
        console.error(`Unable to issue find command ${e}`)
        return {moviesList: [], totalNumMovies: 0}
    }
    }

    static async getRatings(){
        let ratings =[]
        try{
            ratings= await movies.distinct("rated")
            const remove= ['AO', 'NC-17', 'Not Rated', 'NOT RATED', 'PG', 'PG-13', 'R', 'X', 'UNRATED']
            for(var i=0; i<ratings.length; ++i){
                if(remove.includes(ratings[i])){
                    ratings.splice(i, 1)
                    --i
                }
            }
            
            return ratings
        }
        catch(e){
            console.error(`unable to get ratings, ${e}`)
            return ratings
        }
    }

    static async getMovieById(id){
        try{
            return await movies.aggregate([
                {
                    $match: {
                        _id: new ObjectId(id)
                    }
                },
                {
                    $lookup:{
                        from: 'reviews',
                        localField: '_id',
                        foreignField: 'movie_id',
                        as: 'reviews'
                    }
                }
            ]).next()
        }
        catch(e){
            console.error(`something went wrong in getMovieById: ${e}`)
            throw e
        }
    }
}

