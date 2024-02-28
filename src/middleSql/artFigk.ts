export const getArtFigkJoin = `   	
LEFT JOIN files AS jacket_files
ON fa.jacket_file_id = jacket_files.id 

LEFT JOIN files AS video_files
ON fa.video_file_id = video_files.id

LEFT JOIN admin AS pub
ON fa.publisher = pub.id AND pub.is_deleted = 'N'

LEFT JOIN admin AS regi ON 
CASE 
    WHEN updater_id IS NOT NULL THEN updater_id = regi.id
    WHEN publisher IS NOT NULL AND updater_id IS NOT NULL THEN publisher = regi.id
    ELSE register = regi.id
END

`
